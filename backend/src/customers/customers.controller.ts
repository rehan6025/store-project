import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CustomersService, type RegisterCustomerInput, type UpdateCustomerInput } from "./customers.service.js";
import { CustomerAuthGuard } from "./guards/customer-auth.guard.js";
import { CurrentCustomer } from "./decorators/current-customer.decorator.js";
import type { CustomerJwtPayload, LoginCustomerInput } from "./customers.types.js";

@Controller("stores/:storeId/customers")
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    // Store Owner only: list customers of store
    @Get()
    getCustomers(
        @Param("storeId") storeId: string,
        @Headers("x-user-id") userId: string,
        @Query("limit") limit?: string,
        @Query("offset") offset?: string,
    ) {
        const currentUserId = userId ? Number(userId) : 1;
        return this.customersService.getCustomers(
            Number(storeId),
            currentUserId,
            limit ? Number(limit) : 20,
            offset ? Number(offset) : 0,
        );
    }

    // Get customer by ID
    @Get(":customerId")
    getCustomerById(
        @Param("storeId") storeId: string,
        @Param("customerId") customerId: string,
    ) {
        return this.customersService.getCustomerById(Number(storeId), Number(customerId));
    }

    // Shopper registers / creates account within store
    @Post()
    registerCustomer(
        @Param("storeId") storeId: string,
        @Body() body: RegisterCustomerInput,
    ) {
        return this.customersService.registerCustomer(Number(storeId), body);
    }

    // Update customer profile / address
    @Patch(":customerId")
    updateCustomer(
        @Param("storeId") storeId: string,
        @Param("customerId") customerId: string,
        @Body() body: UpdateCustomerInput,
    ) {
        return this.customersService.updateCustomer(Number(storeId), Number(customerId), body);
    }

    // Public: Shopper(customers) logs into their store account
    @Post("login")
    loginCustomer(
        @Param("storeId") storeId: string,
        @Body() body: LoginCustomerInput,
    ) {
        return this.customersService.loginCustomer(Number(storeId), body);
    }

    // Protected: Shopper views their own logged-in profile
    @UseGuards(CustomerAuthGuard)
    @Get("me")
    getMe(
        @CurrentCustomer() customer: CustomerJwtPayload,
    ) {
        return this.customersService.getCustomerById(customer.storeId, customer.sub);
    }
}
