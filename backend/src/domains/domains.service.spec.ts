import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DomainsService } from "./domains.service.js";
import { DomainsRepository } from "./domains.repository.js";
import { RedisService } from "../redis/redis.service.js";

describe("DomainsService", () => {
    let service: DomainsService;

    const repositoryMock = {
        findDomainByHostname: vi.fn(),
        findStoreBySlug: vi.fn(),
        findStoreById: vi.fn(),
        findDomainsByStoreId: vi.fn(),
        findDomainById: vi.fn(),
        createDomain: vi.fn(),
        deleteDomain: vi.fn(),
        findSlugRedirect: vi.fn(),
    };

    const redisMock = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DomainsService,
                {
                    provide: DomainsRepository,
                    useValue: repositoryMock,
                },
                {
                    provide: RedisService,
                    useValue: redisMock,
                },
            ],
        }).compile();

        service = module.get<DomainsService>(DomainsService);
        vi.clearAllMocks();
    });

    describe("resolveHostname (Flow 1 Entrypoint)", () => {
        it("should return cached store immediately on Redis cache hit without querying DB", async () => {
            const cachedStore = {
                storeId: 1,
                storeSlug: "fresh-bakery",
                storeName: "Fresh Bakery",
                hostname: "fresh-bakery.sellvia.com",
            };
            redisMock.get.mockResolvedValue(cachedStore);

            const result = await service.resolveHostname("fresh-bakery.sellvia.com");

            expect(result).toEqual(cachedStore);
            expect(repositoryMock.findDomainByHostname).not.toHaveBeenCalled();
            expect(repositoryMock.findStoreBySlug).not.toHaveBeenCalled();
        });

        it("should resolve custom domain and cache it for 24 hours on cache miss", async () => {
            redisMock.get.mockResolvedValue(null);
            repositoryMock.findDomainByHostname.mockResolvedValue({
                id: 1,
                hostname: "rehansbakery.com",
                store: {
                    id: 10,
                    slug: "fresh-bakery",
                    name: "Fresh Bakery",
                },
            });

            const result = await service.resolveHostname("rehansbakery.com");

            expect(result).toEqual({
                storeId: 10,
                storeSlug: "fresh-bakery",
                storeName: "Fresh Bakery",
                hostname: "rehansbakery.com",
            });
            expect(redisMock.set).toHaveBeenCalledWith(
                "domain:rehansbakery.com",
                expect.any(Object),
                86400,
            );
        });

        it("should resolve platform subdomain by store slug on cache miss", async () => {
            redisMock.get.mockResolvedValue(null);
            repositoryMock.findDomainByHostname.mockResolvedValue(null);
            repositoryMock.findStoreBySlug.mockResolvedValue({
                id: 5,
                slug: "fresh-clothing",
                name: "Fresh Clothing",
            });

            const result = await service.resolveHostname("fresh-clothing.sellvia.com");

            expect(result).toEqual({
                storeId: 5,
                storeSlug: "fresh-clothing",
                storeName: "Fresh Clothing",
                hostname: "fresh-clothing.sellvia.com",
            });
            expect(repositoryMock.findStoreBySlug).toHaveBeenCalledWith("fresh-clothing");
        });

        it("should resolve historical slug redirect (cooldown reroute)", async () => {
            redisMock.get.mockResolvedValue(null);
            repositoryMock.findDomainByHostname.mockResolvedValue(null);
            repositoryMock.findStoreBySlug.mockResolvedValue(null);
            repositoryMock.findSlugRedirect.mockResolvedValue({
                slug: "old-bakery",
                store: {
                    id: 1,
                    slug: "new-bakery",
                    name: "New Bakery",
                },
            });

            const result = await service.resolveHostname("old-bakery.sellvia.com");

            expect(result).toEqual({
                storeId: 1,
                storeSlug: "new-bakery",
                storeName: "New Bakery",
                hostname: "old-bakery.sellvia.com",
            });
            expect(redisMock.set).toHaveBeenCalledWith(
                "domain:old-bakery.sellvia.com",
                expect.any(Object),
                3600,
            );
        });

        it("should throw NotFoundException if domain does not resolve to any store", async () => {
            redisMock.get.mockResolvedValue(null);
            repositoryMock.findDomainByHostname.mockResolvedValue(null);
            repositoryMock.findStoreBySlug.mockResolvedValue(null);
            repositoryMock.findSlugRedirect.mockResolvedValue(null);

            await expect(service.resolveHostname("unknown-store.com")).rejects.toThrow(
                NotFoundException,
            );
        });

        it("should strip port and lowercase hostname before lookup", async () => {
            redisMock.get.mockResolvedValue(null);
            repositoryMock.findDomainByHostname.mockResolvedValue(null);
            repositoryMock.findStoreBySlug.mockResolvedValue({
                id: 1,
                slug: "bakery",
                name: "Bakery",
            });

            await service.resolveHostname("Bakery.Localhost:3000");

            expect(repositoryMock.findStoreBySlug).toHaveBeenCalledWith("bakery");
        });
    });

    describe("addDomain (Flow 2 Merchant Management)", () => {
        it("should throw BadRequestException if user is not the owner of the store", async () => {
            repositoryMock.findStoreById.mockResolvedValue({
                id: 1,
                ownerUserId: 100, // owned by user 100
            });

            await expect(
                service.addDomain(1, 999, { hostname: "mybakery.com" }),
            ).rejects.toThrow(BadRequestException);
        });

        it("should reject reserved platform domain names", async () => {
            repositoryMock.findStoreById.mockResolvedValue({
                id: 1,
                ownerUserId: 10,
            });

            await expect(
                service.addDomain(1, 10, { hostname: "admin.sellvia.com" }),
            ).rejects.toThrow(BadRequestException);
        });

        it("should throw BadRequestException if domain is already claimed by another store", async () => {
            repositoryMock.findStoreById.mockResolvedValue({
                id: 1,
                ownerUserId: 10,
            });
            repositoryMock.findDomainByHostname.mockResolvedValue({
                id: 2,
                hostname: "claimed.com",
                storeId: 2,
            });

            await expect(
                service.addDomain(1, 10, { hostname: "claimed.com" }),
            ).rejects.toThrow(BadRequestException);
        });

        it("should throw BadRequestException if domain is under 30-day cooldown from another store", async () => {
            repositoryMock.findStoreById.mockResolvedValue({
                id: 1,
                ownerUserId: 10,
            });
            repositoryMock.findDomainByHostname.mockResolvedValue(null);
            repositoryMock.findSlugRedirect.mockResolvedValue({
                slug: "nike",
                storeId: 99, // released by store 99
                createdAt: new Date(), // just released
            });

            await expect(
                service.addDomain(1, 10, { hostname: "nike.com" }),
            ).rejects.toThrow(BadRequestException);
        });

        it("should successfully create domain and prime Redis cache", async () => {
            repositoryMock.findStoreById.mockResolvedValue({
                id: 1,
                ownerUserId: 10,
                slug: "fresh-bakery",
                name: "Fresh Bakery",
            });
            repositoryMock.findDomainByHostname.mockResolvedValue(null);
            repositoryMock.findSlugRedirect.mockResolvedValue(null);
            repositoryMock.createDomain.mockResolvedValue({
                id: 10,
                storeId: 1,
                hostname: "mybakery.com",
            });

            const result = await service.addDomain(1, 10, { hostname: "mybakery.com" });

            expect(result.hostname).toBe("mybakery.com");
            expect(redisMock.set).toHaveBeenCalledWith(
                "domain:mybakery.com",
                {
                    storeId: 1,
                    storeSlug: "fresh-bakery",
                    storeName: "Fresh Bakery",
                    hostname: "mybakery.com",
                },
                86400,
            );
        });
    });

    describe("getStoreDomains & removeDomain", () => {
        it("should throw ForbiddenException if user does not own store in getStoreDomains", async () => {
            repositoryMock.findStoreById.mockResolvedValue({ id: 1, ownerUserId: 10 });

            await expect(service.getStoreDomains(1, 999)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it("should return domains for store owner", async () => {
            repositoryMock.findStoreById.mockResolvedValue({ id: 1, ownerUserId: 10 });
            repositoryMock.findDomainsByStoreId.mockResolvedValue([
                { id: 1, hostname: "custom.com" },
            ]);

            const domains = await service.getStoreDomains(1, 10);
            expect(domains.length).toBe(1);
        });

        it("should delete domain and invalidate Redis cache on removeDomain", async () => {
            repositoryMock.findStoreById.mockResolvedValue({ id: 1, ownerUserId: 10 });
            repositoryMock.findDomainById.mockResolvedValue({
                id: 5,
                storeId: 1,
                hostname: "custom.com",
            });

            const result = await service.removeDomain(1, 5, 10);

            expect(result.success).toBe(true);
            expect(repositoryMock.deleteDomain).toHaveBeenCalledWith(5);
            expect(redisMock.del).toHaveBeenCalledWith("domain:custom.com");
        });
    });
});
