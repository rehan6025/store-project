import {
    Body,
    Controller,
    Get,
    Headers,
    Param,
    Post,
    Req,
    UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { PaymentsService } from "./payments.service.js";
import type { ProcessPaymentInput } from "./dto/process-payment.dto.js";
import type { PaymentWebhookInput } from "./dto/payment-webhook.dto.js";
import { CustomerAuthGuard } from "../customers/guards/customer-auth.guard.js";
import { CurrentCustomer } from "../customers/decorators/current-customer.decorator.js";
import type { CustomerJwtPayload } from "../customers/customers.types.js";
import type { JwtPayload } from "../auth/auth.types.js";

@Controller("stores/:storeId")
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    // Shopper submits a payment for their pending order
    @UseGuards(CustomerAuthGuard)
    @Post("payments")
    processPayment(
        @Param("storeId") storeId: string,
        @CurrentCustomer() customer: CustomerJwtPayload,
        @Body() body: ProcessPaymentInput,
    ) {
        return this.paymentsService.processPayment(
            Number(storeId),
            customer.sub,
            body,
        );
    }

    // Inspect a specific payment attempt
    @Get("payments/:paymentId")
    getPaymentById(
        @Param("storeId") storeId: string,
        @Param("paymentId") paymentId: string,
        @Req() req: Request & { user?: JwtPayload; customer?: CustomerJwtPayload },
    ) {
        return this.paymentsService.getPaymentById(
            Number(storeId),
            Number(paymentId),
            {
                customerId: req.customer ? req.customer.sub : undefined,
                userId: req.user ? Number(req.user.sub) : undefined,
            },
        );
    }

    // Inspect all payment attempts for a given order (shopper retries / history)
    @Get("orders/:orderId/payments")
    getOrderPayments(
        @Param("storeId") storeId: string,
        @Param("orderId") orderId: string,
        @Req() req: Request & { user?: JwtPayload; customer?: CustomerJwtPayload },
    ) {
        return this.paymentsService.getOrderPayments(
            Number(storeId),
            Number(orderId),
            {
                customerId: req.customer ? req.customer.sub : undefined,
                userId: req.user ? Number(req.user.sub) : undefined,
            },
        );
    }

    // Public: Asynchronous Webhook callback called by payment providers
    @Post("payments/webhook/:provider")
    handleWebhook(
        @Param("storeId") storeId: string,
        @Param("provider") provider: string,
        @Headers("x-webhook-signature") signature: string,
        @Body() body: PaymentWebhookInput,
    ) {
        return this.paymentsService.handleWebhook(
            Number(storeId),
            provider,
            signature,
            body,
        );
    }
}
