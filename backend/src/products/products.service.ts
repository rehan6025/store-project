import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) {}

    async getProducts(storeId: number) {
        const products = this.prisma.product.findMany({
            where: {
                storeId: storeId,
            },
        });

        return products;
    }
}
