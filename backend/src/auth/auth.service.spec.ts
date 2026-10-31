import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "./auth.service.js";
import { Test, type TestingModule } from "@nestjs/testing";
import { AuthRepository } from "./auth.repository.js";
import { JwtModule, JwtService } from "@nestjs/jwt";
import {
    BadRequestException,
    ConflictException,
    UnauthorizedException,
} from "@nestjs/common";
import argon2 from "argon2";

const PEPPER = Buffer.from(process.env.PASSWORD_PEPPER || "", "utf-8");

describe("AuthService", () => {
    let service: AuthService;
    let jwtService: JwtService;

    const repositoryMock = {
        findUserByEmail: vi.fn(),
        findUserById: vi.fn(),
        createUser: vi.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                JwtModule.register({
                    secret: "test_secret_key_12345",
                    signOptions: { expiresIn: "7d" },
                }),
            ],
            providers: [
                AuthService,
                {
                    provide: AuthRepository,
                    useValue: repositoryMock,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jwtService = module.get<JwtService>(JwtService);
        vi.clearAllMocks();
    });



    describe("register",()=>{
        it("should register and return a valid jwt",async()=>{
            repositoryMock.findUserByEmail.mockResolvedValue(null)
            repositoryMock.createUser.mockResolvedValue({
                id:"user-1",
                email:"merchant@test.com",
                role:"MERCHANT"
            })

            const result = await service.register({
                email: " Merchant@Test.com ",
                password: "securepassword123",
            });

            expect(result.user).toEqual({
                id: "user-1",
                email: "merchant@test.com",
                role: "MERCHANT",
            });

            const decoded = await jwtService.verifyAsync(result.accessToken);
            expect(decoded.sub).toBe("user-1");
            expect(decoded.email).toBe("merchant@test.com");
            expect(decoded.role).toBe("MERCHANT");
        })

        it("should throw BadRequestException if password is too short", async () => {
            await expect(
                service.register({
                    email: "test@test.com",
                    password: "123",
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it("should throw ConflictException if email already registered", async () => {
            repositoryMock.findUserByEmail.mockResolvedValue({
                id: "existing-user",
                email: "merchant@test.com",
            });

            await expect(
                service.register({
                    email: "merchant@test.com",
                    password: "securepassword123",
                }),
            ).rejects.toThrow(ConflictException);
        });


    })

    describe("login",()=>{
        it("should login successfully and return a valid JWT",async () => {
            const passwordHash = await argon2.hash("mypassword123",{
                type: argon2.argon2id,
                secret:PEPPER
            })

            repositoryMock.findUserByEmail.mockResolvedValue({
                id: "user-1",
                email: "merchant@test.com",
                passwordHash,
                role: "MERCHANT",
            });

            const result = await service.login({
                email:"merchant@test.com",
                password:"mypassword123"
            })

            expect(result.user.id).toBe("user-1");
            const decoded = await jwtService.verifyAsync(result.accessToken);
            expect(decoded.sub).toBe("user-1");
        })

        it("should throw UnauthorizedException if user not found", async () => {
            repositoryMock.findUserByEmail.mockResolvedValue(null);

            await expect(
                service.login({
                    email: "nonexistent@test.com",
                    password: "anyPassword123",
                }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("should throw UnauthorizedException if password does not match", async () => {
            const passwordHash = await argon2.hash("correctPassword123", {
                type: argon2.argon2id,
                secret: PEPPER,
            });

            repositoryMock.findUserByEmail.mockResolvedValue({
                id: "user-1",
                email: "merchant@test.com",
                passwordHash,
                role: "MERCHANT",
            });

            await expect(
                service.login({
                    email: "merchant@test.com",
                    password: "wrongPassword123",
                }),
            ).rejects.toThrow(UnauthorizedException);
        });


    })
})