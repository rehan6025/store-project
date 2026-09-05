import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { ProductsService } from "./products.service.js";

describe("ProductsService - integration", () => {
    let service: ProductsService;
    let prisma: PrismaService;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ProductsService, PrismaService],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it("returns only products belonging to the requested store", async () => {
        // We'll put the real DB test here

        const storeA = await prisma.store.findFirst({
            where: {
                slug: "fresh-bakery",
            },
        });

        const storeB = await prisma.store.findFirst({
            where: {
                slug: "fresh-clothing",
            },
        });

        expect(storeA).not.toBeNull();
        expect(storeB).not.toBeNull();

        const products = await service.getProducts(storeA!.id);

        expect(products.length).toBeGreaterThan(0);

        expect(
            products.every((product) => product.storeId === storeA!.id),
        ).toBe(true);

        expect(products.some((product) => product.storeId === storeB!.id)).toBe(
            false,
        );
    });
});
