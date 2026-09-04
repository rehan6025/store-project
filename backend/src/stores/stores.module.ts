import { Module } from "@nestjs/common";
import { StoresController } from "./stores.controller.js";
import { StoreService } from "./stores.service.js";

@Module({
    controllers: [StoresController],
    providers: [StoreService],
    exports: [StoreService],
})
export class StoresModule {}
