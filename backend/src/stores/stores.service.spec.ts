import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
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

    it("createStore throws BadRequestException when an unexpired redirect exists for the slug", async () => {
        const mockSlugRedirect = {
            id: 1 , 
            slug:"apple",
            storeId: 1,
            createdAt: new Date(Date.now() - 10 *  24 * 60 * 60 * 1000) // 10 days ago
        }
        prismaMock.slugRedirect.findFirst.mockResolvedValue(mockSlugRedirect)
        
        const newStoreData = {
            name:"apple",
            slug:"apple",
            allowsDelivery: true,
            allowsPickup: true
        }
        await expect(service.createStore(2, newStoreData)).rejects.toThrow(BadRequestException);
    });

    it("createStore succeeds and deletes redirect when an existing redirect is expired (> 30 days)", async () => {
        const expiredRedirect = {
            id: 99,
            slug: "apple",
            storeId: 1,
            createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago (expired)
        };

        // No active store has "apple"
        prismaMock.store.findFirst.mockResolvedValue(null);
        // Found an expired redirect
        prismaMock.slugRedirect.findFirst.mockResolvedValue(expiredRedirect);
        // Mock delete resolving successfully
        prismaMock.slugRedirect.delete.mockResolvedValue(expiredRedirect);

        const createdStoreMock = {
            id: 10,
            name: "apple",
            slug: "apple",
            plan: "BASIC",
            ownerUserId: 2,
            allowsDelivery: true,
            allowsPickup: true,
        };
        // Mock store.create returning the newly created store
        prismaMock.store.create.mockResolvedValue(createdStoreMock);

        const newStoreData = {
            name: "apple",
            slug: "apple",
            allowsDelivery: true,
            allowsPickup: true,
        };

        const result = await service.createStore(2, newStoreData);

        // Verify the store was created successfully
        expect(result).toEqual(createdStoreMock);

        // Verify the expired redirect was deleted
        expect(prismaMock.slugRedirect.delete).toHaveBeenCalledWith({
            where: { id: expiredRedirect.id },
        });

        // Verify store.create was called
        expect(prismaMock.store.create).toHaveBeenCalled();
    });
});
