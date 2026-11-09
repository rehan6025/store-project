import "dotenv/config";
import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthController } from "./auth.controller.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { CustomerAuthGuard } from "../customers/guards/customer-auth.guard.js";

@Global()
@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET || "default_jwt_secret",
            signOptions: { expiresIn: "7d" },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, AuthRepository, JwtAuthGuard, CustomerAuthGuard],
    exports: [AuthService, JwtModule, JwtAuthGuard, CustomerAuthGuard],
})
export class AuthModule {}
