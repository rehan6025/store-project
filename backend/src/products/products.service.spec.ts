import { PrismaService } from "../prisma/prisma.service.js";
import { ProductsService } from "./products.service.js";
import { Test, TestingModule } from "@nestjs/testing";

describe("ProductsService", () => {
    let service: ProductsService;

    const prismaMock = {
        product: {
            findMany: vi.fn(),
        },
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
    });

    afterEach(async () => {
        vi.clearAllMocks();
    });

    it("returns only products belonging to the requested store", async () => {
        prismaMock.product.findMany.mockResolvedValue([
            { id: 1, storeId: 1, name: "Chocolate Cake" },
        ]);

        const result = await service.getProducts(1);

        expect(result).toEqual([
            {
                id: 1,
                storeId: 1,
                name: "Chocolate Cake",
            },
        ]);

        expect(prismaMock.product.findMany).toHaveBeenCalledWith({
            where: {
                storeId: 1,
            },
        });
    });
});

// Given:
// Store A → Product A
// Store B → Product B

// When:
// ProductService.getProducts(Store A)

// Then:
// returns Product A
// does NOT return Product B
