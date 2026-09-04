import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { ProductsService, type CreateProductInput } from "./products.service.js";
import { ProductStatus } from "../../generated/prisma/enums.js";

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
    @Post()
    createProduct(
        @Param("storeId") storeId: string,
        @Headers("x-user-id") userId: string,
        @Body() body: CreateProductInput,
    ) {
        const currentUserId = userId ? Number(userId) : 1;
        return this.productsService.createProduct(Number(storeId), currentUserId, body);
    }

    // Soft delete / archive a product
    @Patch(":productId/archive")
    archiveProduct(
        @Param("storeId") storeId: string,
        @Param("productId") productId: string,
        @Headers("x-user-id") userId: string,
    ) {
        const currentUserId = userId ? Number(userId) : 1;
        return this.productsService.archiveProduct(Number(storeId), currentUserId, Number(productId));
    }
}
