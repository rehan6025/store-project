import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { ProductsModule } from './products/products.module.js';
import { StoresModule } from './stores/stores.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { CartsModule } from './carts/carts.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { StoreConfigModule } from './store-config/store-config.module.js';

@Module({
    imports: [
        PrismaModule,
        HealthModule,
        ProductsModule,
        StoresModule,
        CategoriesModule,
        CustomersModule,
        CartsModule,
        OrdersModule,
        PaymentsModule,
        StoreConfigModule,
    ],
})
export class AppModule {}
