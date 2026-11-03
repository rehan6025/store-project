import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { OrdersService, type CheckoutInput } from "./orders.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CustomerAuthGuard } from "../customers/guards/customer-auth.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { CurrentCustomer } from "../customers/decorators/current-customer.decorator.js";
import type { JwtPayload } from "../auth/auth.types.js";
import type { CustomerJwtPayload } from "../customers/customers.types.js";

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
    @UseGuards(CustomerAuthGuard)
    @Get("my-orders")
    getMyOrders(
        @Param("storeId") storeId: string,
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Query("limit") limit?: string,
        @Query("offset") offset?: string,
    ) {
        return this.ordersService.getCustomerOrders(
            Number(storeId),
            customer.sub,
            limit ? Number(limit) : 20,
            offset ? Number(offset) : 0,
        );
    }

    // Customer checkout: converts active cart into a pending order
    @UseGuards(CustomerAuthGuard)
    @Post("checkout")
    checkout(
        @Param("storeId") storeId: string,
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() body: CheckoutInput,
    ) {
        return this.ordersService.checkout(Number(storeId), customer.sub, body);
    }

    // Get single order details
    @Get(":orderId")
    getOrderById(
        @Param("storeId") storeId: string,
        @Param("orderId") orderId: string,
        @Req() req: Request & { user?: JwtPayload; customer?: CustomerJwtPayload },
    ) {
        return this.ordersService.getOrderById(Number(storeId), Number(orderId), {
            customerId: req.customer ? req.customer.sub : undefined,
            userId: req.user ? Number(req.user.sub) : undefined,
        });
    }
}
