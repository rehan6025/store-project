import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { PaymentStatus, OrderStatus } from "../../generated/prisma/enums.js";

@Injectable()
export class PaymentsRepository {
    constructor(private readonly prisma: PrismaService) { }

    // Expose prisma client for transactions
    get client() {
        return this.prisma;
    }

    async findOrderById(storeId: number, orderId: number) {
        return await this.prisma.order.findFirst({
            where: {
                id: orderId,
                storeId,
            },
            include: {
                payments: true,
                orderItems: true
            },
        });
    }

    async findPaymentById(paymentId: number) {
        return await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                order: true,
            },
        });
    }

    async findPaymentsByOrder(orderId: number) {
        return await this.prisma.payment.findMany({
            where: { orderId },
            orderBy: { createdAt: "desc" },
        });
    }
}
