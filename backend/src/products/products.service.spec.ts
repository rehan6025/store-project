import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { ProductsService } from "./products.service.js";
import { ProductStatus } from "../../generated/prisma/enums.js";

describe("ProductsService", () => {
    let service: ProductsService;

    const prismaMock = {
        store: {
            findUnique: vi.fn(),
        },
        product: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        inventory: {
            create: vi.fn(),
        },
        productCategory: {
            createMany: vi.fn(),
        },
        $transaction: vi.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
            ],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
        vi.clearAllMocks();
    });

    it("returns only products belonging to the requested store", async () => {
        const storeAProducts = [
            {
                id: 1,
                storeId: 1,
                name: "Chocolate Cake",
            },
        ];

        prismaMock.product.findMany.mockResolvedValue(storeAProducts);

        const result = await service.getProducts(1);

        expect(result).toEqual(storeAProducts);
        expect(prismaMock.product.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    storeId: 1,
                    status: ProductStatus.ACTIVE,
                },
            }),
        );
    });

    it("throws ForbiddenException when user is not the store owner on createProduct", async () => {
        prismaMock.store.findUnique.mockResolvedValue({ id: 1, ownerUserId: 99 });

        await expect(
            service.createProduct(1, 10, {
                name: "Cake",
                slug: "cake",
                description: "Sweet",
                price: 100,
            }),
        ).rejects.toThrow(ForbiddenException);
    });

    it("throws BadRequestException when slug already exists in the same store", async () => {
        prismaMock.store.findUnique.mockResolvedValue({ id: 1, ownerUserId: 10 });
        prismaMock.product.findFirst.mockResolvedValue({ id: 5, slug: "cake" });

        await expect(
            service.createProduct(1, 10, {
                name: "Cake",
                slug: "cake",
                description: "Sweet",
                price: 100,
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it("creates product and inventory atomically inside transaction", async () => {
        prismaMock.store.findUnique.mockResolvedValue({ id: 1, ownerUserId: 10 });
        prismaMock.product.findFirst.mockResolvedValue(null);

        const mockCreatedProduct = { id: 42, name: "Cake", slug: "cake" };
        const mockFullProduct = {
            ...mockCreatedProduct,
            inventories: { stockCount: 25 },
            productCategories: [],
        };

        prismaMock.$transaction.mockImplementation(async (callback) => {
            const tx = {
                product: {
                    create: vi.fn().mockResolvedValue(mockCreatedProduct),
                    findUnique: vi.fn().mockResolvedValue(mockFullProduct),
                },
                inventory: {
                    create: vi.fn().mockResolvedValue({ id: 1, stockCount: 25 }),
                },
                productCategory: {
                    createMany: vi.fn().mockResolvedValue({ count: 0 }),
                },
            };
            return await callback(tx);
        });

        const result = await service.createProduct(1, 10, {
            name: "Cake",
            slug: "cake",
            description: "Sweet",
            price: 100,
            initialStock: 25,
        });

        expect(result).toEqual(mockFullProduct);
        expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it("archives a product by setting status to ARCHIVED", async () => {
        prismaMock.store.findUnique.mockResolvedValue({ id: 1, ownerUserId: 10 });
        prismaMock.product.findUnique.mockResolvedValue({ id: 42, storeId: 1, status: ProductStatus.ACTIVE });
        prismaMock.product.update.mockResolvedValue({ id: 42, status: ProductStatus.ARCHIVED });

        const result = await service.archiveProduct(1, 10, 42);

        expect(result.status).toEqual(ProductStatus.ARCHIVED);
        expect(prismaMock.product.update).toHaveBeenCalledWith({
            where: { id: 42 },
            data: { status: ProductStatus.ARCHIVED },
        });
    });
});
