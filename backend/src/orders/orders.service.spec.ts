import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrdersService } from "./orders.service.js";
import { OrdersRepository } from "./orders.repository.js";
import { FullfillmentType, OrderStatus, ProductStatus } from "../../generated/prisma/enums.js";
import { count } from "console";

describe("OrdersService - checkout", () => {
    let service: OrdersService;

    const txMock = {
        inventory: {
            updateMany: vi.fn(),
            update: vi.fn(),
        },
        order: {
            create: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        cartItem: {
            deleteMany: vi.fn(),
        },
    };

    const repositoryMock = {
        getStore: vi.fn(),
        findCustomer: vi.fn(),
        findCartWithItems: vi.fn(),
        client: {
            // Tells Vitest: when $transaction(callback) is called, execute the callback with our txMock!
            $transaction: vi.fn(async (callback) => await callback(txMock)),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                {
                    provide: OrdersRepository,
                    useValue: repositoryMock,
                },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
        vi.clearAllMocks();
    });

    it("should throw badrequest if cart is empty", async() => {
        repositoryMock.getStore.mockResolvedValue({ id: 1, ownerUserId: 1 });
        repositoryMock.findCustomer.mockResolvedValue({ id: 1, address: "address", name: "name" });
        repositoryMock.findCartWithItems.mockResolvedValue(null);

        await expect(service.checkout(1, 1, { fulfillmentType: FullfillmentType.DELIVERY, deliveryAddress: "address" })).rejects.toThrow(BadRequestException);
    });

    it("should reject if store does not allow delivery when fulfillment type is delivery", async() => {
        repositoryMock.getStore.mockResolvedValue({ id: 1, ownerUserId: 1, allowsDelivery: false, allowsPickup: true });
        repositoryMock.findCustomer.mockResolvedValue({ id: 1, address: "address", name: "name" });
        repositoryMock.findCartWithItems.mockResolvedValue({ id: 1, cartItems: [{ id: 1, productId: 1, quantity: 1, unitPrice: 10, product: { id: 1, name: "product", status: ProductStatus.ACTIVE, currency: "INR", inventories: { stockCount: 1 } } }] });
        
        await expect(service.checkout(1, 1, { fulfillmentType: FullfillmentType.DELIVERY, deliveryAddress: "address" })).rejects.toThrow(BadRequestException);
    });

    it("should checkout successfully when all inputs are valid", async () => {
        repositoryMock.getStore.mockResolvedValue({ id: 1, allowsDelivery: true, allowsPickup: true });
        repositoryMock.findCustomer.mockResolvedValue({ id: 1, address: "123 Main St", name: "Alice" });

        const mockCart = {
            id: 10,
            cartItems: [
                {
                    productId: 5,
                    quantity: 2,
                    unitPrice: 100,
                    product: {
                        name: "Cake",
                        status: ProductStatus.ACTIVE,
                        currency: "INR",
                        inventories: { stockCount: 10 },
                    },
                },
            ],
        };

        repositoryMock.findCartWithItems.mockResolvedValue(mockCart);
        txMock.inventory.updateMany.mockResolvedValue({ count: 8 });

        const expectedOrder = {
            id: 100,
            storeId: 1,
            customerId: 1,
            status: OrderStatus.PENDING,
            fulfillmentType: FullfillmentType.DELIVERY,
            totalAmount: 200,
            orderItems: [
                {
                    productId: 5,
                    quantity: 2,
                    priceAtPurchase: 100,
                },
            ],
        };
        txMock.order.create.mockResolvedValue(expectedOrder);

        const result = await service.checkout(1, 1, {
            fulfillmentType: FullfillmentType.DELIVERY,
            deliveryAddress: "123 Main St",
        });

        expect(result).toEqual(expectedOrder);
        expect(txMock.inventory.updateMany).toHaveBeenCalledWith({
            where: {
                productId: 5,
                stockCount: { gte: 2 },
            },
            data: {
                stockCount: { decrement: 2 },
            },
        });
        expect(txMock.cartItem.deleteMany).toHaveBeenCalledWith({
            where: { cartId: 10 },
        });
    });

    describe("processOrderExpirationJob", () => {
        it("cancels order and restocks inventory when order is pending", async () => {
            const mockPendingOrder = {
                id: 100,
                status: OrderStatus.PENDING,
                orderItems: [
                    { productId: 5, quantity: 2 },
                    { productId: 8, quantity: 1 },
                ],
            };

            txMock.order.findUnique.mockResolvedValue(mockPendingOrder);
            txMock.order.update.mockResolvedValue({ ...mockPendingOrder, status: OrderStatus.CANCELLED });
            txMock.inventory.update.mockResolvedValue({});

            const result = await service.processOrderExpirationJob({ orderId: 100 });

            expect(result?.status).toBe(OrderStatus.CANCELLED);
            expect(txMock.order.update).toHaveBeenCalledWith({
                where: { id: 100 },
                data: { status: OrderStatus.CANCELLED },
            });
            expect(txMock.inventory.update).toHaveBeenCalledWith({
                where: { productId: 5 },
                data: { stockCount: { increment: 2 } },
            });
            expect(txMock.inventory.update).toHaveBeenCalledWith({
                where: { productId: 8 },
                data: { stockCount: { increment: 1 } },
            });
        });

        it("does nothing if order is already paid/confirmed", async () => {
            const mockPaidOrder = {
                id: 100,
                status: OrderStatus.CONFIRMED,
                orderItems: [{ productId: 5, quantity: 2 }],
            };

            txMock.order.findUnique.mockResolvedValue(mockPaidOrder);

            const result = await service.processOrderExpirationJob({ orderId: 100 });

            expect(result).toBeNull();
            expect(txMock.order.update).not.toHaveBeenCalled();
            expect(txMock.inventory.update).not.toHaveBeenCalled();
        });
    });
});