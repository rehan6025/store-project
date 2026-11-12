import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseGuards,
} from "@nestjs/common";
import { FlashSalesService } from "./flash-sales.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CustomerAuthGuard } from "../customers/guards/customer-auth.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { CurrentCustomer } from "../customers/decorators/current-customer.decorator.js";
import type { JwtPayload } from "../auth/auth.types.js";
import type { CustomerJwtPayload } from "../customers/customers.types.js";
import type { CreateFlashSaleInput } from "./dto/create-flash-sale.dto.js";
import type { ReserveFlashSaleInput } from "./dto/reserve-flash-sale.dto.js";
import { StoreOwnerGuard } from "../auth/guards/store-owner.guard.js";

@Controller("stores/:storeId/flash-sales")
export class FlashSalesController {
    constructor(private readonly flashSalesService: FlashSalesService) { }

    @UseGuards(JwtAuthGuard, StoreOwnerGuard)
    @Post()
    createFlashSale(
        @Param("storeId") storeId: string,
        @CurrentUser() user: JwtPayload,
        @Body() body: CreateFlashSaleInput,
    ) {
        return this.flashSalesService.createFlashSale(
            Number(storeId),
            Number(user.sub),
            body,
        );
    }

    @UseGuards(JwtAuthGuard, StoreOwnerGuard)
    @Get()
    getStoreFlashSales(
        @Param("storeId") storeId: string,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.flashSalesService.getStoreFlashSales(
            Number(storeId),
            Number(user.sub),
        );
    }

    @Get("active")
    getActiveFlashSales(@Param("storeId") storeId: string) {
        return this.flashSalesService.getActiveFlashSales(Number(storeId));
    }

    @UseGuards(CustomerAuthGuard)
    @Post(":saleId/reserve")
    reserveStock(
        @Param("storeId") storeId: string,
        @Param("saleId") saleId: string,
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() body: ReserveFlashSaleInput,
    ) {
        return this.flashSalesService.reserveStock(
            Number(storeId),
            Number(saleId),
            Number(customer.sub),
            body,
        );
    }
}

