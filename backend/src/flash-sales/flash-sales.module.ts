import { Module } from "@nestjs/common";
import { FlashSalesController } from "./flash-sales.controller.js";
import { FlashSalesService } from "./flash-sales.service.js";
import { FlashSalesRepository } from "./flash-sales.repository.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { RedisModule } from "../redis/redis.module.js";

@Module({
    imports: [PrismaModule, RedisModule],
    controllers: [FlashSalesController],
    providers: [FlashSalesService, FlashSalesRepository],
    exports: [FlashSalesService, FlashSalesRepository],
})
export class FlashSalesModule {}

