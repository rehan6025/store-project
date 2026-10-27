import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseGuards,
} from "@nestjs/common";
import { StoreConfigService } from "./store-config.service.js";
import type { PublishConfigInput } from "./dto/publish-config.dto.js";
import type { RollbackConfigInput } from "./dto/rollback-config.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { JwtPayload } from "../auth/auth.types.js";

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
    @UseGuards(JwtAuthGuard)
    @Get("stores/:storeId/config/history")
    getConfigHistory(
        @Param("storeId") storeId: string,
        @CurrentUser() user: JwtPayload,
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.storeConfigService.getConfigHistory(Number(storeId), currentUserId);
    }

    // Protected: Merchant publishes new configuration version
    @UseGuards(JwtAuthGuard)
    @Post("stores/:storeId/config/publish")
    publishConfig(
        @Param("storeId") storeId: string,
        @CurrentUser() user: JwtPayload,
        @Body() body: PublishConfigInput,
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.storeConfigService.publishConfig(
            Number(storeId),
            currentUserId,
            body,
        );
    }

    // Protected: Merchant rolls back to a previous version
    @UseGuards(JwtAuthGuard)
    @Post("stores/:storeId/config/rollback")
    rollbackConfig(
        @Param("storeId") storeId: string,
        @CurrentUser() user: JwtPayload,
        @Body() body: RollbackConfigInput,
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.storeConfigService.rollbackConfig(
            Number(storeId),
            currentUserId,
            body,
        );
    }
}
