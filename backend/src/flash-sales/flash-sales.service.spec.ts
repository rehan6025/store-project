import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlashSalesService } from "./flash-sales.service.js";
import { FlashSalesRepository } from "./flash-sales.repository.js";
import { RedisService } from "../redis/redis.service.js";
import { ReservationStatus } from "../../generated/prisma/enums.js";

describe("FlashSalesService", () => {
    let service: FlashSalesService;

    const repositoryMock = {
        findProduct: vi.fn(),
        createFlashSale: vi.fn(),
        findFlashSalesByStore: vi.fn(),
        findFlashSaleById: vi.fn(),
        findActiveFlashSales: vi.fn(),
        createReservation: vi.fn(),
        findReservationById: vi.fn(),
        expireReservation: vi.fn(),
        fulfillReservation: vi.fn(),
    };

    const redisMock = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        eval: vi.fn(),
        incrBy: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        repositoryMock.createReservation.mockResolvedValue({ id: 99 });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FlashSalesService,
                {
                    provide: FlashSalesRepository,
                    useValue: repositoryMock,
                },
                {
                    provide: RedisService,
                    useValue: redisMock,
                },
            ],
        }).compile();

        service = module.get<FlashSalesService>(FlashSalesService);
    });

    describe("createFlashSale", () => {
        it("throws BadRequestException when startsAt is after endsAt", async () => {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            await expect(
                service.createFlashSale(1, 1, {
                    productId: 10,
                    startsAt: tomorrow,
                    endsAt: now,
                    salePrice: 50,
                    stockLimit: 10,
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it("throws BadRequestException when endsAt is in the past", async () => {
            const past1 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
            const past2 = new Date(Date.now() - 24 * 60 * 60 * 1000);

            await expect(
                service.createFlashSale(1, 1, {
                    productId: 10,
                    startsAt: past1,
                    endsAt: past2,
                    salePrice: 50,
                    stockLimit: 10,
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it("throws NotFoundException when product does not exist in store", async () => {
            repositoryMock.findProduct.mockResolvedValue(null);

            const now = new Date();
            const endsAt = new Date(now.getTime() + 60 * 60 * 1000);

            await expect(
                service.createFlashSale(1, 1, {
                    productId: 999,
                    startsAt: now,
                    endsAt,
                    salePrice: 50,
                    stockLimit: 10,
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it("throws BadRequestException when salePrice is not less than product price", async () => {
            repositoryMock.findProduct.mockResolvedValue({
                id: 10,
                price: 100,
                inventories: { stockCount: 50 },
            });

            const now = new Date();
            const endsAt = new Date(now.getTime() + 60 * 60 * 1000);

            await expect(
                service.createFlashSale(1, 1, {
                    productId: 10,
                    startsAt: now,
                    endsAt,
                    salePrice: 100, // Not a discount
                    stockLimit: 10,
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it("throws BadRequestException when stockLimit exceeds available inventory", async () => {
            repositoryMock.findProduct.mockResolvedValue({
                id: 10,
                price: 100,
                inventories: { stockCount: 15 },
            });

            const now = new Date();
            const endsAt = new Date(now.getTime() + 60 * 60 * 1000);

            await expect(
                service.createFlashSale(1, 1, {
                    productId: 10,
                    startsAt: now,
                    endsAt,
                    salePrice: 60,
                    stockLimit: 20, // Exceeds 15
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it("successfully creates sale and pre-seeds Redis when sale is active", async () => {
            repositoryMock.findProduct.mockResolvedValue({
                id: 10,
                price: 100,
                inventories: { stockCount: 50 },
            });

            const now = new Date();
            const startsAt = new Date(now.getTime() - 1000); // Already started
            const endsAt = new Date(now.getTime() + 60 * 60 * 1000);

            const mockCreatedSale = {
                id: 42,
                storeId: 1,
                productId: 10,
                startsAt,
                endsAt,
                salePrice: 60,
                stockLimit: 20,
            };

            repositoryMock.createFlashSale.mockResolvedValue(mockCreatedSale);

            const result = await service.createFlashSale(1, 1, {
                productId: 10,
                startsAt,
                endsAt,
                salePrice: 60,
                stockLimit: 20,
            });

            expect(result).toEqual(mockCreatedSale);
            expect(redisMock.set).toHaveBeenCalledWith("flashsale:stock:42", 20);
            expect(redisMock.del).toHaveBeenCalledWith("store:flashsales:active:1");
        });
    });

    describe("getActiveFlashSales", () => {
        it("returns cached active flash sales on Redis hit", async () => {
            const cachedSales = [{ id: 1, salePrice: 50 }];
            redisMock.get.mockResolvedValue(cachedSales);

            const result = await service.getActiveFlashSales(1);

            expect(result).toEqual(cachedSales);
            expect(repositoryMock.findActiveFlashSales).not.toHaveBeenCalled();
        });

        it("queries database and caches result on Redis miss", async () => {
            redisMock.get.mockResolvedValue(null);
            const dbSales = [{ id: 1, salePrice: 50 }];
            repositoryMock.findActiveFlashSales.mockResolvedValue(dbSales);

            const result = await service.getActiveFlashSales(1);

            expect(result).toEqual(dbSales);
            expect(repositoryMock.findActiveFlashSales).toHaveBeenCalled();
            expect(redisMock.set).toHaveBeenCalledWith("store:flashsales:active:1", dbSales, 30);
        });
    });

    describe("reserveStock - High Concurrency & Zero Overselling", () => {
        it("throws NotFoundException if flash sale does not exist", async () => {
            repositoryMock.findFlashSaleById.mockResolvedValue(null);

            await expect(service.reserveStock(1, 999, 1, { quantity: 1 })).rejects.toThrow(
                NotFoundException,
            );
        });

        it("throws BadRequestException if sale has not started yet", async () => {
            const future = new Date(Date.now() + 60 * 60 * 1000);
            repositoryMock.findFlashSaleById.mockResolvedValue({
                id: 10,
                startsAt: future,
                endsAt: new Date(future.getTime() + 60 * 60 * 1000),
            });

            await expect(service.reserveStock(1, 10, 1, { quantity: 1 })).rejects.toThrow(
                BadRequestException,
            );
        });

        it("hydrates cold cache from database remaining stock when Redis key is absent", async () => {
            const now = new Date();
            repositoryMock.findFlashSaleById.mockResolvedValue({
                id: 10,
                startsAt: new Date(now.getTime() - 1000),
                endsAt: new Date(now.getTime() + 60 * 60 * 1000),
                stockLimit: 10,
                soldQuantity: 2,
                reservationQuantity: 3,
            });

            redisMock.get.mockResolvedValue(null); // Cold cache
            redisMock.eval.mockResolvedValue(1); // Lua decrements

            await service.reserveStock(1, 10, 1, { quantity: 1 });

            // 10 - 2 - 3 = 5 remaining
            expect(redisMock.set).toHaveBeenCalledWith("flashsale:stock:10", 5);
        });

        it("guarantees 0 overselling: exactly 5 succeed and 45 fail among 50 concurrent requests", async () => {
            const now = new Date();
            const activeSale = {
                id: 10,
                startsAt: new Date(now.getTime() - 1000),
                endsAt: new Date(now.getTime() + 60 * 60 * 1000),
                stockLimit: 5,
                soldQuantity: 0,
                reservationQuantity: 0,
            };

            repositoryMock.findFlashSaleById.mockResolvedValue(activeSale);
            redisMock.get.mockResolvedValue(5);

            // Emulate atomic Redis Lua script behavior in memory:
            let inMemoryStock = 5;
            redisMock.eval.mockImplementation(async (_script, _keys, args) => {
                const requested = Number(args[0]);
                if (inMemoryStock >= requested) {
                    inMemoryStock -= requested;
                    return 1; // Stock acquired
                }
                return 0; // Sold out
            });

            // Simulate 50 concurrent customer requests hitting reserveStock simultaneously
            const concurrentRequests = Array.from({ length: 50 }, (_, i) =>
                service.reserveStock(1, 10, 100 + i, { quantity: 1 }),
            );

            const results = await Promise.allSettled(concurrentRequests);

            const successes = results.filter((r) => r.status === "fulfilled");
            const rejections = results.filter((r) => r.status === "rejected");

            // Assertions
            expect(successes.length).toBe(5);
            expect(rejections.length).toBe(45);
            expect(inMemoryStock).toBe(0); // Zero overselling!

            // Verify successful reservations return status and reservation token
            for (const success of successes) {
                if (success.status === "fulfilled") {
                    expect(success.value.status).toBe("RESERVED");
                    expect(success.value.reservationToken).toMatch(/^res_/);
                    expect(success.value.expiresInSeconds).toBe(600);
                }
            }

            // Verify rejections were 400 Sold Out
            for (const rejection of rejections) {
                if (rejection.status === "rejected") {
                    expect(rejection.reason).toBeInstanceOf(BadRequestException);
                    expect(rejection.reason.message).toContain("Sold out");
                }
            }
        });
    });

    describe("processExpirationJob - Active Delayed Restock Worker", () => {
        it("restores Redis stock via INCRBY when reservation expires", async () => {
            repositoryMock.expireReservation.mockResolvedValue({
                id: 55,
                flashSaleId: 10,
                status: ReservationStatus.EXPIRED,
            });

            await service.processExpirationJob({
                reservationId: 55,
                flashSaleId: 10,
                quantity: 2,
            });

            expect(repositoryMock.expireReservation).toHaveBeenCalledWith(55, 10, 2);
            expect(redisMock.incrBy).toHaveBeenCalledWith("flashsale:stock:10", 2);
        });

        it("does not increment Redis stock if reservation was already purchased", async () => {
            repositoryMock.expireReservation.mockResolvedValue(null);

            await service.processExpirationJob({
                reservationId: 55,
                flashSaleId: 10,
                quantity: 2,
            });

            expect(redisMock.incrBy).not.toHaveBeenCalled();
        });
    });
});
