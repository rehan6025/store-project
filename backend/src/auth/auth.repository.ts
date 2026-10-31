import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class AuthRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findUserByEmail(email: string) {
        return await this.prisma.user.findUnique({
            where: { email },
        });
    }

    async findUserById(id: number) {
        return await this.prisma.user.findUnique({
            where: { id },
        });
    }

    async createUser(data: { email: string; passwordHash: string; role?: string }) {
        return await this.prisma.user.create({
            data: {
                email: data.email,
                passwordHash: data.passwordHash,
                role: data.role ?? "MERCHANT",
            },
        });
    }
}
