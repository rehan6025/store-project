import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Res,
    UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { StoreService } from "./stores.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { JwtPayload } from "../auth/auth.types.js";

@Controller("stores")
export class StoresController {
    constructor(private readonly storeService: StoreService) {}

    @Get()
    getAllStores(
        @Query("limit") limit?: string,
        @Query("offset") offset?: string,
    ) {
        return this.storeService.getAllStores(
            limit ? Number(limit) : 20,
            offset ? Number(offset) : 0,
        );
    }

    @Get(":id")
    getStoreById(@Param("id") id: string) {
        return this.storeService.getStoreById(Number(id));
    }

    @Get("slug/:slug")
    async getStoreBySlug(@Param("slug") slug: string, @Res() res: Response) {
        const result = await this.storeService.getStoreBySlug(slug);
        if(result.isRedirect === false) return res.status(200).json(result.store);

        return res.redirect(301,`/stores/slug/${result.redirectToSlug}`)
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    createStore(
        @CurrentUser() user: JwtPayload,
        @Body() body: { name: string; slug: string; allowsDelivery?: boolean; allowsPickup?: boolean },
    ) {
        const currentUserId = user.sub ? Number(user.sub) : 1;
        return this.storeService.createStore(currentUserId, body);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(":id")
    updateStore(
        @Param("id") id: string,
        @CurrentUser() user: JwtPayload,
        @Body() body: { name?: string; slug?: string; allowsDelivery?: boolean; allowsPickup?: boolean },
    ) {
        const currentUserId = user.sub ? Number(user.sub) : 1;
        return this.storeService.updateStore(Number(id), currentUserId, body);
    }
}
