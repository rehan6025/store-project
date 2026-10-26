import "dotenv/config";
import {
    BadRequestException,
    ConflictException,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import { AuthRepository } from "./auth.repository.js";
import type {
    AuthResponse,
    AuthUser,
    JwtPayload,
    LoginInput,
    RegisterInput,
} from "./auth.types.js";

const PEPPER = Buffer.from(process.env.PASSWORD_PEPPER || "", "utf-8");

@Injectable()
export class AuthService {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly jwtService: JwtService,
    ) {}

    async register(input: RegisterInput): Promise<AuthResponse> {
        const normalizedEmail = input.email.trim().toLowerCase();

        if (!input.password || input.password.length < 6) {
            throw new BadRequestException("Password must be at least 6 characters");
        }

        const existingUser = await this.authRepository.findUserByEmail(normalizedEmail);
        if (existingUser) {
            throw new ConflictException("User with this email already exists");
        }

        const passwordHash = await argon2.hash(input.password, {
            type: argon2.argon2id,
            secret: PEPPER,
        });

        const user = await this.authRepository.createUser({
            email: normalizedEmail,
            passwordHash,
            role: input.role ?? "MERCHANT",
        });

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = await this.jwtService.signAsync(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        };
    }

    async login(input: LoginInput): Promise<AuthResponse> {
        const normalizedEmail = input.email.trim().toLowerCase();

        const user = await this.authRepository.findUserByEmail(normalizedEmail);
        if (!user || !user.passwordHash) {
            throw new UnauthorizedException("Invalid email or password");
        }

        const isPasswordValid = await argon2.verify(
            user.passwordHash,
            input.password,
            { secret: PEPPER },
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid email or password");
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = await this.jwtService.signAsync(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        };
    }
}
