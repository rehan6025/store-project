import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { StoreService } from "./stores.service.js";

describe("StoreService - Rote CRUD Tests", () => {
    let service: StoreService;

    const prismaMock = {
        store: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        slugRedirect: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn(),
        },
        $transaction: vi.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StoreService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
            ],
        }).compile();

        service = module.get<StoreService>(StoreService);
        vi.clearAllMocks();
    });

    it("getAllStores returns paginated stores", async () => {
        const mockStores = [{ id: 1, name: "Store 1", slug: "store-1" }];
        prismaMock.store.findMany.mockResolvedValue(mockStores);

        const result = await service.getAllStores(10, 0);

        expect(result).toEqual(mockStores);
        expect(prismaMock.store.findMany).toHaveBeenCalledWith({
            take: 10,
            skip: 0,
        });
    });

    it("getStoreById returns store when found", async () => {
        const mockStore = { id: 1, name: "Store 1", slug: "store-1" };
        prismaMock.store.findUnique.mockResolvedValue(mockStore);

        const result = await service.getStoreById(1);

        expect(result).toEqual(mockStore);
        expect(prismaMock.store.findUnique).toHaveBeenCalledWith({
            where: { id: 1 },
        });
    });

    it("getStoreById throws NotFoundException when not found", async () => {
        prismaMock.store.findUnique.mockResolvedValue(null);

        await expect(service.getStoreById(999)).rejects.toThrow(NotFoundException);
    });
});
