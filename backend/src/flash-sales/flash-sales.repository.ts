import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { ReservationStatus } from "../../generated/prisma/enums.js";

@Injectable()
export class FlashSalesRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findStoreById(storeId: number) {
        return this.prisma.store.findUnique({
            where: { id: storeId },
        });
    }

    async findProduct(storeId: number, productId: number) {
        return this.prisma.product.findFirst({
            where: {
                id: productId,
                storeId,
            },
            include: {
                inventories: true,
            },
        });
    }

    async createFlashSale(data: {
        storeId: number;
        productId: number;
        startsAt: Date;
        endsAt: Date;
        salePrice: number;
        stockLimit: number;
    }) {
        return this.prisma.flashSale.create({
            data: {
                storeId: data.storeId,
                productId: data.productId,
                startsAt: data.startsAt,
                endsAt: data.endsAt,
                salePrice: data.salePrice,
                stockLimit: data.stockLimit,
                reservationQuantity: 0,
                soldQuantity: 0,
            },
            include: {
                product: true,
            },
        });
    }

    async findFlashSalesByStore(storeId: number) {
        return this.prisma.flashSale.findMany({
            where: { storeId },
            include: { product: true },
            orderBy: { startsAt: "desc" },
        });
    }

    async findFlashSaleById(storeId: number, saleId: number) {
        return this.prisma.flashSale.findFirst({
            where: {
                id: saleId,
                storeId,
            },
            include: { product: true },
        });
    }

    async findActiveFlashSales(storeId: number, now: Date) {
        return this.prisma.flashSale.findMany({
            where: {
                storeId,
                startsAt: { lte: now },
                endsAt: { gte: now },
            },
            include: { product: true },
        });
    }

    async createReservation(data: {
        flashSaleId: number;
        customerId: number;
        quantity: number;
        expiresAt: Date;
    }) {
        return this.prisma.$transaction(async (tx) => {
            const reservation = await tx.reservation.create({
                data: {
                    flashSaleId: data.flashSaleId,
                    customerId: data.customerId,
                    quantity: data.quantity,
                    status: ReservationStatus.RESERVED,
                    expiresAt: data.expiresAt,
                },
            });

            await tx.flashSale.update({
                where: { id: data.flashSaleId },
                data: {
                    reservationQuantity: {
                        increment: data.quantity,
                    },
                },
            });

            return reservation;
        });
    }

    async findReservationById(reservationId: number) {
        return this.prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { flashSale: true },
        });
    }

    async expireReservation(reservationId: number, flashSaleId: number, quantity: number) {
        return this.prisma.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({
                where: { id: reservationId },
            });

            if (!reservation || reservation.status !== ReservationStatus.RESERVED) {
                return null;
            }

            const updated = await tx.reservation.update({
                where: { id: reservationId },
                data: { status: ReservationStatus.EXPIRED },
            });

            await tx.flashSale.update({
                where: { id: flashSaleId },
                data: {
                    reservationQuantity: {
                        decrement: quantity,
                    },
                },
            });

            return updated;
        });
    }

    async fulfillReservation(reservationId: number, orderId: number) {
        return this.prisma.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({
                where: { id: reservationId },
            });

            if (!reservation || reservation.status !== ReservationStatus.RESERVED) {
                return null;
            }

            const updated = await tx.reservation.update({
                where: { id: reservationId },
                data: {
                    status: ReservationStatus.PURCHASED,
                    order_id: orderId,
                },
            });

            await tx.flashSale.update({
                where: { id: reservation.flashSaleId },
                data: {
                    reservationQuantity: {
                        decrement: reservation.quantity,
                    },
                    soldQuantity: {
                        increment: reservation.quantity,
                    },
                },
            });

            return updated;
        });
    }
}

