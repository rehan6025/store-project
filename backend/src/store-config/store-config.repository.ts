import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { StoreConfigStatus } from "../../generated/prisma/enums.js";
import type { StoreConfigContent } from "./store-config.types.js";

@Injectable()
export class StoreConfigRepository {
    constructor(private readonly prisma: PrismaService) {}

    get client() {
        return this.prisma;
    }

    async findStoreById(storeId: number) {
        return await this.prisma.store.findUnique({
            where: { id: storeId },
        });
    }

    async findStoreBySlug(slug: string) {
        return await this.prisma.store.findUnique({
            where: { slug },
        });
    }

    async findActiveConfig(storeId: number) {
        return await this.prisma.storeConfig.findFirst({
            where: {
                storeId,
                status: StoreConfigStatus.ACTIVE,
            },
            orderBy: {
                version: "desc",
            },
        });
    }

    async findLatestVersion(storeId: number) {
        return await this.prisma.storeConfig.findFirst({
            where: { storeId },
            orderBy: { version: "desc" },
        });
    }

    async findConfigByVersion(storeId: number, version: number) {
        return await this.prisma.storeConfig.findFirst({
            where: {
                storeId,
                version,
            },
        });
    }

    async findConfigHistory(storeId: number) {
        return await this.prisma.storeConfig.findMany({
            where: { storeId },
            orderBy: { version: "desc" },
            select: {
                id: true,
                version: true,
                schemaVersion: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async createInitialConfig(storeId: number, content: StoreConfigContent) {
        return await this.prisma.storeConfig.create({
            data: {
                storeId,
                version: 1,
                schemaVersion: "1.0.0",
                contentJson: content as any,
                status: StoreConfigStatus.ACTIVE,
            },
        });
    }
}
