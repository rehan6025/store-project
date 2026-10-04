import { Module } from "@nestjs/common";
import { StoreConfigController } from "./store-config.controller.js";
import { StoreConfigService } from "./store-config.service.js";
import { StoreConfigRepository } from "./store-config.repository.js";

@Module({
    controllers: [StoreConfigController],
    providers: [StoreConfigService, StoreConfigRepository],
    exports: [StoreConfigService, StoreConfigRepository],
})
export class StoreConfigModule {}
