import {
    Body,
    Controller,
    Get,
    Headers,
    Param,
    Post,
} from "@nestjs/common";
import { StoreConfigService } from "./store-config.service.js";
import type { PublishConfigInput } from "./dto/publish-config.dto.js";
import type { RollbackConfigInput } from "./dto/rollback-config.dto.js";

@Controller()
export class StoreConfigController {
    constructor(private readonly storeConfigService: StoreConfigService) {}

    // Public: Storefront fetches active config by storeId
    @Get("stores/:storeId/config")
    getActiveConfig(@Param("storeId") storeId: string) {
        return this.storeConfigService.getActiveConfig(Number(storeId));
    }

    // Public: Storefront fetches active config by store slug (for custom subdomains / routing)
    @Get("storefront/:slug/config")
    getActiveConfigBySlug(@Param("slug") slug: string) {
        return this.storeConfigService.getActiveConfigBySlug(slug);
    }

    // Protected: Merchant fetches revision history
    @Get("stores/:storeId/config/history")
    getConfigHistory(
        @Param("storeId") storeId: string,
        @Headers("x-user-id") userId: string,
    ) {
        const currentUserId = userId ? Number(userId) : 1;
        return this.storeConfigService.getConfigHistory(Number(storeId), currentUserId);
    }

    // Protected: Merchant publishes new configuration version
    @Post("stores/:storeId/config/publish")
    publishConfig(
        @Param("storeId") storeId: string,
        @Headers("x-user-id") userId: string,
        @Body() body: PublishConfigInput,
    ) {
        const currentUserId = userId ? Number(userId) : 1;
        return this.storeConfigService.publishConfig(
            Number(storeId),
            currentUserId,
            body,
        );
    }

    // Protected: Merchant rolls back to a previous version
    @Post("stores/:storeId/config/rollback")
    rollbackConfig(
        @Param("storeId") storeId: string,
        @Headers("x-user-id") userId: string,
        @Body() body: RollbackConfigInput,
    ) {
        const currentUserId = userId ? Number(userId) : 1;
        return this.storeConfigService.rollbackConfig(
            Number(storeId),
            currentUserId,
            body,
        );
    }
}
