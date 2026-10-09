import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StoreConfigService } from "./store-config.service.js";
import { StoreConfigRepository } from "./store-config.repository.js";
import { StoreConfigStatus } from "../../generated/prisma/enums.js";
import { DEFAULT_STORE_CONFIG_CONTENT } from "./store-config.types.js";
import { RedisService } from "../redis/redis.service.js";

describe("StoreConfigService", () => {
    let service: StoreConfigService;

    const txMock = {
        storeConfig: {
            findFirst: vi.fn(),
            updateMany: vi.fn(),
            create: vi.fn(),
        },
    };

    const repositoryMock = {
        findStoreById: vi.fn(),
        findStoreBySlug: vi.fn(),
        findActiveConfig: vi.fn(),
        findLatestVersion: vi.fn(),
        findConfigByVersion: vi.fn(),
        findConfigHistory: vi.fn(),
        client: {
            $transaction: vi.fn(async (cb) => await cb(txMock)),
        },
    };

    const redisMock = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
    };


    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StoreConfigService,
                {
                    provide: StoreConfigRepository,
                    useValue: repositoryMock,
                },
                {provide: RedisService, useValue: redisMock}
            ],
        }).compile();

        service = module.get<StoreConfigService>(StoreConfigService);
        vi.clearAllMocks();
    });

    describe("getActiveConfig", () => {
        it("should return the active config when present in database", async () => {
            repositoryMock.findStoreById.mockResolvedValue({
                id: 1,
                name: "Fresh Bakery",
            });

            const activeRow = {
                id: 10,
                storeId: 1,
                version: 2,
                schemaVersion: "1.0.0",
                contentJson: DEFAULT_STORE_CONFIG_CONTENT,
                status: StoreConfigStatus.ACTIVE,
            };
            repositoryMock.findActiveConfig.mockResolvedValue(activeRow);

            const result = await service.getActiveConfig(1);

            expect(result.storeId).toBe("1");
            expect(result.version).toBe(2);
            expect(result.schemaVersion).toBe("1.0.0");
            expect(result.theme.colors.primary).toBe("#7c3aed");
        });

        it("should return fallback default template if no active config exists", async () => {
            repositoryMock.findStoreById.mockResolvedValue({
                id: 2,
                name: "New Store",
            });
            repositoryMock.findActiveConfig.mockResolvedValue(null);

            const result = await service.getActiveConfig(2);

            expect(result.storeId).toBe("2");
            expect(result.version).toBe(1);
            expect(result.meta.name).toBe("New Store");
            expect(result.theme).toEqual(DEFAULT_STORE_CONFIG_CONTENT.theme);
        });

        it("should throw NotFoundException if store does not exist", async () => {
            repositoryMock.findStoreById.mockResolvedValue(null);

            await expect(service.getActiveConfig(999)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe("getActiveConfigBySlug", () => {
        it("should resolve active config by store slug", async () => {
            repositoryMock.findStoreBySlug.mockResolvedValue({
                id: 1,
                slug: "fresh-bakery",
                name: "Fresh Bakery",
            });
            repositoryMock.findStoreById.mockResolvedValue({
                id: 1,
                name: "Fresh Bakery",
            });
            repositoryMock.findActiveConfig.mockResolvedValue(null);

            const result = await service.getActiveConfigBySlug("Fresh-Bakery ");

            expect(repositoryMock.findStoreBySlug).toHaveBeenCalledWith("fresh-bakery");
            expect(result.storeId).toBe("1");
        });
    });

    describe("publishConfig", () => {
        it("should throw ForbiddenException if user does not own the store", async () => {
            repositoryMock.findStoreById.mockResolvedValue({
                id: 1,
                ownerUserId: 100, // owned by 100
            });

            await expect(
                service.publishConfig(1, 999, {
                    contentJson: DEFAULT_STORE_CONFIG_CONTENT,
                }),
            ).rejects.toThrow(ForbiddenException);
        });

        it("should demote previous active configs and increment version in transaction", async () => {
            repositoryMock.findStoreById.mockResolvedValue({
                id: 1,
                ownerUserId: 10,
                name: "Fresh Bakery",
            });

            txMock.storeConfig.findFirst.mockResolvedValue({
                version: 3,
            });

            const createdRow = {
                id: 15,
                storeId: 1,
                version: 4,
                schemaVersion: "1.0.0",
                contentJson: DEFAULT_STORE_CONFIG_CONTENT,
                status: StoreConfigStatus.ACTIVE,
            };
            txMock.storeConfig.create.mockResolvedValue(createdRow);

            const result = await service.publishConfig(1, 10, {
                contentJson: DEFAULT_STORE_CONFIG_CONTENT,
            });

            expect(result.version).toBe(4);
            expect(txMock.storeConfig.updateMany).toHaveBeenCalledWith({
                where: {
                    storeId: 1,
                    status: StoreConfigStatus.ACTIVE,
                },
                data: {
                    status: StoreConfigStatus.BACKUP,
                },
            });
            expect(txMock.storeConfig.create).toHaveBeenCalledWith({
                data: {
                    storeId: 1,
                    version: 4,
                    schemaVersion: "1.0.0",
                    contentJson: DEFAULT_STORE_CONFIG_CONTENT,
                    status: StoreConfigStatus.ACTIVE,
                },
            });
        });
    });

    describe("rollbackConfig", () => {
        it("should throw NotFoundException if target version does not exist", async () => {
            repositoryMock.findStoreById.mockResolvedValue({
                id: 1,
                ownerUserId: 10,
            });
            repositoryMock.findConfigByVersion.mockResolvedValue(null);

            await expect(
                service.rollbackConfig(1, 10, { targetVersion: 2 }),
            ).rejects.toThrow(NotFoundException);
        });

        it("should restore target version as a new forward-only revision", async () => {
            repositoryMock.findStoreById.mockResolvedValue({
                id: 1,
                ownerUserId: 10,
                name: "Fresh Bakery",
            });

            const targetRow = {
                id: 5,
                version: 2,
                schemaVersion: "1.0.0",
                contentJson: DEFAULT_STORE_CONFIG_CONTENT,
            };
            repositoryMock.findConfigByVersion.mockResolvedValue(targetRow);

            txMock.storeConfig.findFirst.mockResolvedValue({ version: 4 });

            const restoredRow = {
                id: 20,
                storeId: 1,
                version: 5,
                schemaVersion: "1.0.0",
                contentJson: DEFAULT_STORE_CONFIG_CONTENT,
                status: StoreConfigStatus.ACTIVE,
            };
            txMock.storeConfig.create.mockResolvedValue(restoredRow);

            const result = await service.rollbackConfig(1, 10, { targetVersion: 2 });

            expect(result.version).toBe(5);
            expect(txMock.storeConfig.updateMany).toHaveBeenCalledWith({
                where: {
                    storeId: 1,
                    status: StoreConfigStatus.ACTIVE,
                },
                data: {
                    status: StoreConfigStatus.BACKUP,
                },
            });
        });
    });

    describe("Redis Caching", () => {
        it("should return cached config without querying database on cache hit", async () => {
            repositoryMock.findStoreById.mockResolvedValue({ id: 1, name: "Fresh Bakery" });

            const cachedData = {
                schemaVersion: "1.0.0",
                storeId: "1",
                version: 2,
                meta: { name: "Fresh Bakery" },
                theme: DEFAULT_STORE_CONFIG_CONTENT.theme,
                pages: DEFAULT_STORE_CONFIG_CONTENT.pages,
            };
            redisMock.get.mockResolvedValue(cachedData);

            const result = await service.getActiveConfig(1);

            expect(result).toEqual(cachedData);
            expect(repositoryMock.findActiveConfig).not.toHaveBeenCalled();
        });

        it("should save to cache on cache miss", async () => {
            repositoryMock.findStoreById.mockResolvedValue({ id: 1, name: "Fresh Bakery" });
            redisMock.get.mockResolvedValue(null);
            repositoryMock.findActiveConfig.mockResolvedValue(null);

            await service.getActiveConfig(1);

            expect(redisMock.set).toHaveBeenCalledWith("store:config:1", expect.any(Object), 3600);
        });

        it("should invalidate cache on publish", async () => {
            repositoryMock.findStoreById.mockResolvedValue({ id: 1, ownerUserId: 10, name: "Fresh Bakery" });
            txMock.storeConfig.findFirst.mockResolvedValue({ version: 1 });
            txMock.storeConfig.create.mockResolvedValue({
                version: 2,
                schemaVersion: "1.0.0",
                contentJson: DEFAULT_STORE_CONFIG_CONTENT,
            });

            await service.publishConfig(1, 10, { contentJson: DEFAULT_STORE_CONFIG_CONTENT });

            expect(redisMock.del).toHaveBeenCalledWith("store:config:1");
        });
    });

    describe("Zod Schema Validation", () => {
        it("should throw BadRequestException if schemaVersion is unsupported", async () => {
            repositoryMock.findStoreById.mockResolvedValue({ id: 1, ownerUserId: 10 });

            await expect(
                service.publishConfig(1, 10, {
                    schemaVersion: "99.0.0",
                    contentJson: DEFAULT_STORE_CONFIG_CONTENT,
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it("should throw BadRequestException if contentJson has an invalid section type", async () => {
            repositoryMock.findStoreById.mockResolvedValue({ id: 1, ownerUserId: 10 });

            const invalidContent = {
                ...DEFAULT_STORE_CONFIG_CONTENT,
                pages: [
                    {
                        id: "p1",
                        slug: "/",
                        title: "Home",
                        sections: [{ id: "s1", type: "INVALID_WIDGET", props: {} }],
                    },
                ],
            };

            await expect(
                service.publishConfig(1, 10, {
                    contentJson: invalidContent as any,
                }),
            ).rejects.toThrow(BadRequestException);
        });
    });

});
