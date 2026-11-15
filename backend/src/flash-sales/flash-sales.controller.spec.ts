import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlashSalesController } from "./flash-sales.controller.js";
import { FlashSalesService } from "./flash-sales.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { StoreOwnerGuard } from "../auth/guards/store-owner.guard.js";
import { CustomerAuthGuard } from "../customers/guards/customer-auth.guard.js";

describe("FlashSalesController", () => {
    let controller: FlashSalesController;

    const flashSalesServiceMock = {
        createFlashSale: vi.fn(),
        getStoreFlashSales: vi.fn(),
        getActiveFlashSales: vi.fn(),
        reserveStock: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [FlashSalesController],
            providers: [
                {
                    provide: FlashSalesService,
                    useValue: flashSalesServiceMock,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(StoreOwnerGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(CustomerAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<FlashSalesController>(FlashSalesController);
    });

    it("createFlashSale delegates to service", async () => {
        const mockSale = { id: 1, stockLimit: 10 };
        flashSalesServiceMock.createFlashSale.mockResolvedValue(mockSale);

        const input: any = {
            productId: 5,
            startsAt: new Date().toISOString(),
            endsAt: new Date().toISOString(),
            salePrice: 50,
            stockLimit: 10,
        };

        const result = await controller.createFlashSale("1", { sub: 42 } as any, input);

        expect(result).toEqual(mockSale);
        expect(flashSalesServiceMock.createFlashSale).toHaveBeenCalledWith(1, 42, input);
    });

    it("getActiveFlashSales delegates to service", async () => {
        const mockSales = [{ id: 1, salePrice: 50 }];
        flashSalesServiceMock.getActiveFlashSales.mockResolvedValue(mockSales);

        const result = await controller.getActiveFlashSales("1");

        expect(result).toEqual(mockSales);
        expect(flashSalesServiceMock.getActiveFlashSales).toHaveBeenCalledWith(1);
    });

    it("reserveStock delegates to service with customerId", async () => {
        const mockRes = { status: "RESERVED", reservationToken: "res_123" };
        flashSalesServiceMock.reserveStock.mockResolvedValue(mockRes);

        const result = await controller.reserveStock(
            "1",
            "10",
            { sub: 99 } as any,
            { quantity: 2 },
        );

        expect(result).toEqual(mockRes);
        expect(flashSalesServiceMock.reserveStock).toHaveBeenCalledWith(1, 10, 99, { quantity: 2 });
    });
});

