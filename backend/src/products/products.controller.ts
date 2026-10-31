import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ProductsService, type CreateProductInput } from "./products.service.js";
import { ProductStatus } from "../../generated/prisma/enums.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { JwtPayload } from "../auth/auth.types.js";

@Controller("stores/:storeId/products")
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    // List products for store
    @Get()
    getProducts(
        @Param("storeId") storeId: string,
        @Query("limit") limit?: string,
        @Query("offset") offset?: string,
        @Query("status") status?: ProductStatus,
    ) {
        return this.productsService.getProducts(Number(storeId), {
            limit: limit ? Number(limit) : 20,
            offset: offset ? Number(offset) : 0,
            status,
        });
    }

    // Get single product
    @Get(":productId")
    getProductById(
        @Param("storeId") storeId: string,
        @Param("productId") productId: string,
    ) {
        return this.productsService.getProductById(Number(storeId), Number(productId));
    }

    // Create a product with initial inventory
    @UseGuards(JwtAuthGuard)
    @Post()
    createProduct(
        @Param("storeId") storeId: string,
        @CurrentUser() user: JwtPayload,
        @Body() body: CreateProductInput,
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.productsService.createProduct(Number(storeId), currentUserId, body);
    }

    // Soft delete / archive a product
    @UseGuards(JwtAuthGuard)
    @Patch(":productId/archive")
    archiveProduct(
        @Param("storeId") storeId: string,
        @Param("productId") productId: string,
        @CurrentUser() user: JwtPayload
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.productsService.archiveProduct(Number(storeId), currentUserId, Number(productId));
    }
}
