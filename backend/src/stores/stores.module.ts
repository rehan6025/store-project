import { Module } from "@nestjs/common";
import { StoresController } from "./stores.controller.js";
import { StoreService } from "./stores.service.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
    imports: [AuthModule],
    controllers: [StoresController],
    providers: [StoreService],
    exports: [StoreService],
})
export class StoresModule {}
