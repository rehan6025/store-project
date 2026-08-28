import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { ProductsModule } from './products/products.module.js';

@Module({
    imports: [PrismaModule, HealthModule, ProductsModule],
})
export class AppModule {}
