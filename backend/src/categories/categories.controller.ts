import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CategoriesService, type CreateCategoryInput, type UpdateCategoryInput } from "./categories.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { JwtPayload } from "../auth/auth.types.js";

@Controller("stores/:storeId/categories")
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    // Public: list categories for store
    @Get()
    getCategories(@Param("storeId") storeId: string) {
        return this.categoriesService.getCategories(Number(storeId));
    }

    // Public: get single category with its products
    @Get(":categoryId")
    getCategoryById(
        @Param("storeId") storeId: string,
        @Param("categoryId") categoryId: string,
    ) {
        return this.categoriesService.getCategoryById(Number(storeId), Number(categoryId));
    }

    // Owner only: create category
    @UseGuards(JwtAuthGuard)
    @Post()
    createCategory(
        @Param("storeId") storeId: string,
        @CurrentUser() user: JwtPayload,
        @Body() body: CreateCategoryInput,
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.categoriesService.createCategory(Number(storeId), currentUserId, body);
    }

    // Owner only: update category
    @UseGuards(JwtAuthGuard)
    @Patch(":categoryId")
    updateCategory(
        @Param("storeId") storeId: string,
        @Param("categoryId") categoryId: string,
        @CurrentUser() user: JwtPayload,
        @Body() body: UpdateCategoryInput,
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.categoriesService.updateCategory(
            Number(storeId),
            currentUserId,
            Number(categoryId),
            body,
        );
    }

    // Owner only: delete category
    @UseGuards(JwtAuthGuard)
    @Delete(":categoryId")
    deleteCategory(
        @Param("storeId") storeId: string,
        @Param("categoryId") categoryId: string,
        @CurrentUser() user: JwtPayload,
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.categoriesService.deleteCategory(
            Number(storeId),
            currentUserId,
            Number(categoryId),
        );
    }
}
