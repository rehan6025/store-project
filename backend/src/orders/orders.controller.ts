import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { OrdersService, type CheckoutInput } from "./orders.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { JwtPayload } from "../auth/auth.types.js";

@Controller("stores/:storeId/orders")
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    // Merchant view: list all orders for this store
    @UseGuards(JwtAuthGuard)
    @Get()
    getStoreOrders(
        @Param("storeId") storeId: string,
        @CurrentUser() user: JwtPayload,
        @Query("limit") limit?: string,
        @Query("offset") offset?: string,
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.ordersService.getStoreOrders(
            Number(storeId),
            currentUserId,
            limit ? Number(limit) : 20,
            offset ? Number(offset) : 0,
        );
    }

    // Customer view: list their own past orders
    @Get("my-orders")
    getMyOrders(
        @Param("storeId") storeId: string,
        @Headers("x-customer-id") customerId: string,
        @Query("limit") limit?: string,
        @Query("offset") offset?: string,
    ) {
        const currentCustomerId = customerId ? Number(customerId) : 1;
        return this.ordersService.getCustomerOrders(
            Number(storeId),
            currentCustomerId,
            limit ? Number(limit) : 20,
            offset ? Number(offset) : 0,
        );
    }

    // Get single order details
    @Get(":orderId")
    getOrderById(
        @Param("storeId") storeId: string,
        @Param("orderId") orderId: string,
        @Headers("x-customer-id") customerId?: string,
        @Headers("x-user-id") userId?: string,
    ) {
        return this.ordersService.getOrderById(Number(storeId), Number(orderId), {
            customerId: customerId ? Number(customerId) : undefined,
            userId: userId ? Number(userId) : undefined,
        });
    }

    // Customer checkout: converts active cart into a pending order
    @Post("checkout")
    checkout(
        @Param("storeId") storeId: string,
        @Headers("x-customer-id") customerId: string,
        @Body() body: CheckoutInput,
    ) {
        const currentCustomerId = customerId ? Number(customerId) : 1;
        return this.ordersService.checkout(Number(storeId), currentCustomerId, body);
    }
}
