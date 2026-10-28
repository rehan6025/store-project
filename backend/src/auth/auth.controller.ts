import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import type {
    AuthResponse,
    AuthUser,
    JwtPayload,
    LoginInput,
    RegisterInput,
} from "./auth.types.js";

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("register")
    async register(@Body() input: RegisterInput): Promise<AuthResponse> {
        return this.authService.register(input);
    }

    @Post("login")
    async login(@Body() input: LoginInput): Promise<AuthResponse> {
        return this.authService.login(input);
    }

    @UseGuards(JwtAuthGuard)
    @Get("me")
    async me(@CurrentUser() user: JwtPayload): Promise<{ user: AuthUser }> {
        return {
            user: {
                id: user.sub,
                email: user.email,
                role: user.role,
            },
        };
    }
}
