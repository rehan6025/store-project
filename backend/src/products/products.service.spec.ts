import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { ProductsService } from "./products.service.js";

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

        expect(prismaMock.product.findMany).toHaveBeenCalledWith({
            where: {
                storeId: 1,
            },
        });
    });
});
