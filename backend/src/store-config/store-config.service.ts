import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { StoreConfigRepository } from "./store-config.repository.js";
import { StoreConfigStatus } from "../../generated/prisma/enums.js";
import {
    DEFAULT_STORE_CONFIG_CONTENT,
    type StoreConfigContent,
    type StoreSchemaResponse,
} from "./store-config.types.js";
import type { PublishConfigInput } from "./dto/publish-config.dto.js";
import type { RollbackConfigInput } from "./dto/rollback-config.dto.js";
import type { SaveDraftInput } from "./dto/save-draft.dto.js";
import { RedisService } from "../redis/redis.service.js";
import { SCHEMA_VALIDATORS } from "./store-config.validator.js";

@Injectable()
export class StoreConfigService {
    constructor(
        private readonly repository: StoreConfigRepository,
        private readonly redis: RedisService
    ) { }

    // Public: Fetch currently active store configuration by numeric store ID
    async getActiveConfig(storeId: number): Promise<StoreSchemaResponse> {
        const store = await this.repository.findStoreById(storeId);
        if (!store) {
            throw new NotFoundException("Store not found");
        }

        const cached = await this.redis.get<StoreSchemaResponse>(this.getCacheKey(storeId))
        if (cached) return cached

        const activeConfig = await this.repository.findActiveConfig(storeId);

        const content = activeConfig?.contentJson as unknown as StoreConfigContent;
        const response: StoreSchemaResponse = {
            schemaVersion: activeConfig?.schemaVersion ?? "1.0.0",
            storeId: String(store.id),
            version: activeConfig?.version ?? 1,
            meta: content?.meta ?? { name: store.name },
            theme: content?.theme ?? DEFAULT_STORE_CONFIG_CONTENT.theme,
            pages: content?.pages ?? DEFAULT_STORE_CONFIG_CONTENT.pages,
        };

        await this.redis.set(this.getCacheKey(storeId), response, 3600);
        return response;

    }

    // Public: Fetch currently active store configuration by store slug
    async getActiveConfigBySlug(slug: string): Promise<StoreSchemaResponse> {
        const store = await this.repository.findStoreBySlug(slug.trim().toLowerCase());
        if (!store) {
            throw new NotFoundException("Store not found");
        }

        return this.getActiveConfig(store.id);
    }

    // Protected: Merchant views version history list
    async getConfigHistory(storeId: number, userId: number) {
        const store = await this.repository.findStoreById(storeId);
        if (!store) {
            throw new NotFoundException("Store not found");
        }
        if (store.ownerUserId !== userId) {
            throw new ForbiddenException("You are not the owner of this store");
        }

        return await this.repository.findConfigHistory(storeId);
    }

    // Protected: Merchant publishes a new revision (Forward-only immutable publish)
    async publishConfig(
        storeId: number,
        userId: number,
        input: PublishConfigInput,
    ): Promise<StoreSchemaResponse> {
        const store = await this.repository.findStoreById(storeId);
        if (!store) {
            throw new NotFoundException("Store not found");
        }
        if (store.ownerUserId !== userId) {
            throw new ForbiddenException("You are not the owner of this store");
        }

        const validator = SCHEMA_VALIDATORS[input.schemaVersion ?? "1.0.0"]

        if (!validator) {
            throw new BadRequestException("Unsupported schema version")
        }

        const parsed = validator.safeParse(input.contentJson)

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten())
        }

        const response = await this.repository.client.$transaction(async (tx) => {
            const latest = await tx.storeConfig.findFirst({
                where: { storeId },
                orderBy: { version: "desc" },
            });

            const nextVersion = (latest?.version ?? 0) + 1;

            // Demote existing active configuration to BACKUP
            await tx.storeConfig.updateMany({
                where: {
                    storeId,
                    status: StoreConfigStatus.ACTIVE,
                },
                data: {
                    status: StoreConfigStatus.BACKUP,
                },
            });

            // Insert newly published revision as ACTIVE
            const created = await tx.storeConfig.create({
                data: {
                    storeId,
                    version: nextVersion,
                    schemaVersion: input.schemaVersion ?? "1.0.0",
                    contentJson: input.contentJson as any,
                    status: StoreConfigStatus.ACTIVE,
                },
            });

            // Clean up working draft once published
            await tx.storeConfig.deleteMany({
                where: {
                    storeId,
                    status: StoreConfigStatus.DRAFT,
                },
            });

            const content = created.contentJson as unknown as StoreConfigContent;
            return {
                schemaVersion: created.schemaVersion,
                storeId: String(store.id),
                version: created.version,
                meta: content?.meta ?? { name: store.name },
                theme: content?.theme ?? DEFAULT_STORE_CONFIG_CONTENT.theme,
                pages: content?.pages ?? DEFAULT_STORE_CONFIG_CONTENT.pages,
            };
        });

        await this.redis.del(this.getCacheKey(storeId));

        return response;
    }

    // Protected: Merchant rolls back to a previous revision (Forward-only restoration)
    async rollbackConfig(
        storeId: number,
        userId: number,
        input: RollbackConfigInput,
    ): Promise<StoreSchemaResponse> {
        const store = await this.repository.findStoreById(storeId);
        if (!store) {
            throw new NotFoundException("Store not found");
        }
        if (store.ownerUserId !== userId) {
            throw new ForbiddenException("You are not the owner of this store");
        }

        const targetConfig = await this.repository.findConfigByVersion(
            storeId,
            input.targetVersion,
        );
        if (!targetConfig) {
            throw new NotFoundException(
                `Config version ${input.targetVersion} not found for this store`,
            );
        }

        const response = await this.repository.client.$transaction(async (tx) => {
            const latest = await tx.storeConfig.findFirst({
                where: { storeId },
                orderBy: { version: "desc" },
            });

            const nextVersion = (latest?.version ?? 0) + 1;

            // Demote current active configuration to BACKUP
            await tx.storeConfig.updateMany({
                where: {
                    storeId,
                    status: StoreConfigStatus.ACTIVE,
                },
                data: {
                    status: StoreConfigStatus.BACKUP,
                },
            });

            // Create new revision restoring target content
            const restored = await tx.storeConfig.create({
                data: {
                    storeId,
                    version: nextVersion,
                    schemaVersion: targetConfig.schemaVersion,
                    contentJson: targetConfig.contentJson as any,
                    status: StoreConfigStatus.ACTIVE,
                },
            });

            const content = restored.contentJson as unknown as StoreConfigContent;
            return {
                schemaVersion: restored.schemaVersion,
                storeId: String(store.id),
                version: restored.version,
                meta: content?.meta ?? { name: store.name },
                theme: content?.theme ?? DEFAULT_STORE_CONFIG_CONTENT.theme,
                pages: content?.pages ?? DEFAULT_STORE_CONFIG_CONTENT.pages,
            };
        });

        await this.redis.del(this.getCacheKey(storeId));

        return response;
    }


    private getCacheKey(storeId: number): string {
        return `store:config:${storeId}`;
    }

    // Protected: Merchant saves working draft (Lenient validation, no Redis cache bust)
    async saveDraft(storeId: number, userId: number, input: SaveDraftInput) {
        const store = await this.repository.findStoreById(storeId);
        if (!store) {
            throw new NotFoundException("Store not found");
        }
        if (store.ownerUserId !== userId) {
            throw new ForbiddenException("You are not the owner of this store");
        }

        const existingDraft = await this.repository.findDraftConfig(storeId);

        const schemaVersion = input.schemaVersion ?? "1.0.0";
        let draft;
        if (existingDraft) {
            draft = await this.repository.updateDraftConfig(
                existingDraft.id,
                schemaVersion,
                input.contentJson,
            );
        } else {
            const nextVersion =
                ((await this.repository.findLatestVersion(storeId))?.version ?? 0) + 1;
            draft = await this.repository.createDraftConfig(
                storeId,
                nextVersion,
                schemaVersion,
                input.contentJson,
            );
        }

        const content = draft.contentJson as unknown as StoreConfigContent;
        return {
            schemaVersion: draft.schemaVersion,
            storeId: String(store.id),
            version: draft.version,
            status: draft.status,
            meta: content?.meta ?? { name: store.name },
            theme: content?.theme ?? DEFAULT_STORE_CONFIG_CONTENT.theme,
            pages: content?.pages ?? DEFAULT_STORE_CONFIG_CONTENT.pages,
        };
    }

    // Protected: Merchant fetches working draft for the builder (falls back to ACTIVE config if no draft)
    async getDraftConfig(storeId: number, userId: number) {
        const store = await this.repository.findStoreById(storeId);
        if (!store) {
            throw new NotFoundException("Store not found");
        }
        if (store.ownerUserId !== userId) {
            throw new ForbiddenException("You are not the owner of this store");
        }

        const draft = await this.repository.findDraftConfig(storeId);
        if (draft) {
            const content = draft.contentJson as unknown as StoreConfigContent;
            return {
                schemaVersion: draft.schemaVersion,
                storeId: String(store.id),
                version: draft.version,
                isDraft: true,
                meta: content?.meta ?? { name: store.name },
                theme: content?.theme ?? DEFAULT_STORE_CONFIG_CONTENT.theme,
                pages: content?.pages ?? DEFAULT_STORE_CONFIG_CONTENT.pages,
            };
        }

        // Fallback: If no draft exists yet, return active config as editor baseline
        const active = await this.getActiveConfig(storeId);
        return {
            ...active,
            isDraft: false,
        };
    }
}
