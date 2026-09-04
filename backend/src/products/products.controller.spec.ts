// GET /stores/:storeId/products
// → calls productsService.getProducts(storeId)
// → returns its result

import { Test, TestingModule } from "@nestjs/testing";
import { ProductsController } from "./products.controller.js";
import { ProductsService } from "./products.service.js";

describe("ProductsController", () => {
    let controller: ProductsController;

    const productsServiceMock = {
        getProducts: vi.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProductsController],
            providers: [
                {
                    provide: ProductsService,
                    useValue: productsServiceMock,
                },
            ],
        }).compile();

        controller = module.get<ProductsController>(ProductsController);

        vi.clearAllMocks();
    });

    it("should return products for the specified store", async () => {
        const mockProducts = [
            {
                id: 1,
                storeId: 1,
                name: "chocolate cake",
            },
            {
                id: 2,
                storeId: 1,
                name: "brownie",
            },
        ];

        productsServiceMock.getProducts.mockResolvedValue(mockProducts);

        const result = await controller.getProducts("1");

        expect(result).toEqual(mockProducts);

        expect(productsServiceMock.getProducts).toHaveBeenCalledWith(1);
        expect(productsServiceMock.getProducts).toHaveBeenCalledTimes(1);
    });
});
