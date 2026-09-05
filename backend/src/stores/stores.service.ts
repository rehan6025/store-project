import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorePlan } from "../../generated/prisma/enums.js";

const SLUG_REDIRECT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days cooldown

type CreateStoreInput = {
    name: string;
    slug: string;
    allowsDelivery?: boolean;
    allowsPickup?: boolean;
};

type UpdateStoreInput = {
    name?: string;
    slug?: string;
    allowsDelivery?: boolean;
    allowsPickup?: boolean;
};

@Injectable()
export class StoreService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllStores(limit = 20, offset = 0) {
        const allStores = await this.prisma.store.findMany({
            take: limit,
            skip: offset,
        });
        return allStores;
    }

    async createStore(userId: number, storeData: CreateStoreInput) {
        storeData.slug = storeData.slug.trim().toLowerCase();

        // Check if an active store with same slug exists
        const storeWithSameName = await this.prisma.store.findFirst({
            where: {
                slug: storeData.slug,
            },
        });

        if (storeWithSameName) {
            throw new BadRequestException("Store with this slug already exists");
        }

        // Check if slug is reserved by a past store redirect
        const storeWithSamePastName = await this.prisma.slugRedirect.findFirst({
            where: {
                slug: storeData.slug,
            },
        });

        if (storeWithSamePastName) {
            const isUnderCooldown =
                Date.now() - storeWithSamePastName.createdAt.getTime() < SLUG_REDIRECT_EXPIRY_MS;

            if (isUnderCooldown) {
                throw new BadRequestException("Store with this slug already exists");
            }

            // Expired redirect: remove stale record so the new store can claim it cleanly
            await this.prisma.slugRedirect.delete({
                where: { id: storeWithSamePastName.id },
            });
        }

        try {
            const store = await this.prisma.store.create({
                data: {
                    ...storeData,
                    plan: StorePlan.BASIC,
                    ownerUserId: userId,
                },
            });
            return store;
        } catch (error) {
            throw new BadRequestException("Failed to create store");
        }
    }

    async getUserStores(userId: number) {
        const stores = await this.prisma.store.findMany({
            where: { ownerUserId: userId },
        });
        return stores;
    }

    async getStoreById(storeId: number) {
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
        });

        if (!store) {
            throw new NotFoundException("Store not found");
        }

        return store;
    }

    async getStoreBySlug(slug: string) {
        const normalizedSlug = slug.trim().toLowerCase();

        // 1. Check active stores
        const store = await this.prisma.store.findUnique({
            where: { slug: normalizedSlug },
        });

        if (store) {
            return { store, isRedirect: false };
        }

        // 2. Check historical redirects
        const redirect = await this.prisma.slugRedirect.findUnique({
            where: { slug: normalizedSlug },
            include: { store: true },
        });

        if (redirect && redirect.store) {
            return {
                store: redirect.store,
                isRedirect: true,
                redirectToSlug: redirect.store.slug,
            };
        }

        throw new NotFoundException("Store not found");
    }

    async updateStore(storeId: number, userId: number, updateData: UpdateStoreInput) {
        return await this.prisma.$transaction(async (tx) => {
            const store = await tx.store.findUnique({
                where: {
                    id: storeId,
                },
            });

            if (!store) {
                throw new NotFoundException("Store not found");
            }

            if (store.ownerUserId !== userId) {
                throw new ForbiddenException("You are not the owner of this store");
            }

            if (updateData.slug) {
                updateData.slug = updateData.slug.trim().toLowerCase();
            }

            if (updateData.slug && updateData.slug !== store.slug) {
                // 1. Check if an active store has this slug
                const existingStore = await tx.store.findFirst({
                    where: {
                        slug: updateData.slug,
                        id: {
                            not: storeId,
                        },
                    },
                });

                // 2. Check if another store has an unexpired redirect for this slug
                const existingSlugRedirect = await tx.slugRedirect.findFirst({
                    where: {
                        slug: updateData.slug,
                        storeId: {
                            not: storeId,
                        },
                    },
                });

                const isRedirectBlocked =
                    existingSlugRedirect &&
                    Date.now() - existingSlugRedirect.createdAt.getTime() < SLUG_REDIRECT_EXPIRY_MS;

                if (existingStore || isRedirectBlocked) {
                    throw new BadRequestException("Store with this slug already exists");
                }

                // 3. Delete any previous redirect record for this new slug
                // (e.g. this store reclaiming its own past slug, or an expired redirect)
                await tx.slugRedirect.deleteMany({
                    where: {
                        slug: updateData.slug,
                    },
                });

                // 4. Record the old slug as a redirect pointing to this store
                await tx.slugRedirect.create({
                    data: {
                        slug: store.slug,
                        storeId: store.id,
                    },
                });
            }

            const updatedStore = await tx.store.update({
                where: {
                    id: storeId,
                },
                data: updateData,
            });

            return updatedStore;
        });
    }
}