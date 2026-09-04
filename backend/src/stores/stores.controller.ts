import {
    Body,
    Controller,
    Get,
    Headers,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
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
