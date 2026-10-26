import "dotenv/config";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthController } from "./auth.controller.js";

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET || "default_jwt_secret",
            signOptions: { expiresIn: "7d" },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, AuthRepository],
    exports: [AuthService, JwtModule],
})
export class AuthModule {}
