import {
    Body,
    Controller,
    Get,
    Headers,
    Param,
    Patch,
    Post,
    Query,
    Res,
} from "@nestjs/common";
import type { Response } from "express";
import { StoreService } from "./stores.service.js";

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

    @Post()
    createStore(
        @Headers("x-user-id") userId: string,
        @Body() body: { name: string; slug: string; allowsDelivery?: boolean; allowsPickup?: boolean },
    ) {
        const currentUserId = userId ? Number(userId) : 1;
        return this.storeService.createStore(currentUserId, body);
    }

    @Patch(":id")
    updateStore(
        @Param("id") id: string,
        @Headers("x-user-id") userId: string,
        @Body() body: { name?: string; slug?: string; allowsDelivery?: boolean; allowsPickup?: boolean },
    ) {
        const currentUserId = userId ? Number(userId) : 1;
        return this.storeService.updateStore(Number(id), currentUserId, body);
    }
}
