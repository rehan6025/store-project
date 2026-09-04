import { Controller, Get, Param } from "@nestjs/common";
import type { ProductsService } from "./products.service.js";

@Controller("stores/:storeId/products")
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Get()
    getProducts(@Param("storeId") storeId: string) {
        return this.productsService.getProducts(Number(storeId));
    }
}
