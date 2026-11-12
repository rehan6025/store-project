import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StoreOwnerGuard } from "./store-owner.guard.js";

describe("StoreOwnerGuard", () => {
    let guard: StoreOwnerGuard;
    let prismaMock: any;

    beforeEach(() => {
        prismaMock = {
            store: {
                findUnique: vi.fn(),
            },
        };
        guard = new StoreOwnerGuard(prismaMock);
    });

    const createMockContext = (request: any) =>
        ({
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        }) as any;

    it("should allow access and attach store when user is the owner", async () => {
        const mockStore = { id: 1, ownerUserId: 42, name: "Test Store" };
        prismaMock.store.findUnique.mockResolvedValue(mockStore);

        const req: any = {
            params: { storeId: "1" },
            user: { sub: 42, email: "owner@test.com", role: "MERCHANT" },
        };

        const result = await guard.canActivate(createMockContext(req));

        expect(result).toBe(true);
        expect(req.store).toEqual(mockStore);
        expect(prismaMock.store.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("should throw NotFoundException if store does not exist", async () => {
        prismaMock.store.findUnique.mockResolvedValue(null);

        const req: any = {
            params: { storeId: "999" },
            user: { sub: 42 },
        };

        await expect(guard.canActivate(createMockContext(req))).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if user is not the store owner", async () => {
        const mockStore = { id: 1, ownerUserId: 99, name: "Other Store" };
        prismaMock.store.findUnique.mockResolvedValue(mockStore);

        const req: any = {
            params: { storeId: "1" },
            user: { sub: 42 },
        };

        await expect(guard.canActivate(createMockContext(req))).rejects.toThrow(ForbiddenException);
    });
});

