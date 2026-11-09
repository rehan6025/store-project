import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from "@nestjs/common";
import { CartsService, type AddCartItemInput, type UpdateCartItemInput } from "./carts.service.js";
import { CustomerAuthGuard } from "../customers/guards/customer-auth.guard.js";
import { CurrentCustomer } from "../customers/decorators/current-customer.decorator.js";
import type { CustomerJwtPayload } from "../customers/customers.types.js";

@UseGuards(CustomerAuthGuard)
@Controller("stores/:storeId/cart")
export class CartsController {
    constructor(private readonly cartsService: CartsService) {}

    // Get active cart
    @Get()
    getCart(
        @Param("storeId") storeId: string,
        @CurrentCustomer() customer: CustomerJwtPayload,
    ) {
        return this.cartsService.getOrCreateCart(Number(storeId), customer.sub);
    }

    // Add item to cart
    @Post("items")
    addItem(
        @Param("storeId") storeId: string,
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() body: AddCartItemInput,
    ) {
        return this.cartsService.addItemToCart(Number(storeId), customer.sub, body);
    }

    // Update item quantity
    @Patch("items/:itemId")
    updateQuantity(
        @Param("storeId") storeId: string,
        @Param("itemId") itemId: string,
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() body: UpdateCartItemInput,
    ) {
        return this.cartsService.updateItemQuantity(
            Number(storeId),
            customer.sub,
            Number(itemId),
            body.quantity,
        );
    }

    // Remove single item from cart
    @Delete("items/:itemId")
    removeItem(
        @Param("storeId") storeId: string,
        @Param("itemId") itemId: string,
        @CurrentCustomer() customer: CustomerJwtPayload,
    ) {
        return this.cartsService.removeItem(Number(storeId), customer.sub, Number(itemId));
    }

    // Clear all items in cart
    @Delete()
    clearCart(
        @Param("storeId") storeId: string,
        @CurrentCustomer() customer: CustomerJwtPayload,
    ) {
        return this.cartsService.clearCart(Number(storeId), customer.sub);
    }
}
