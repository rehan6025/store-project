import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { DomainsRepository } from "./domains.repository.js";
import { RedisService } from "../redis/redis.service.js";
import type { CreateDomainInput, ResolvedStore } from "./domains.types.js";

@Injectable()
export class DomainsService {
    constructor(
        private readonly repository: DomainsRepository,
        private readonly redis: RedisService,
    ) {}

    private getCacheKey(hostname: string): string {
        return `domain:${hostname}`;
    }

    // Core Resolution Logic 
    async resolveHostname(rawHostname: string): Promise<ResolvedStore> {
        // 1. Sanitize hostname: lowercase and strip port (e.g. "Bakery.Localhost:3000" -> "bakery.localhost")
        const hostname = rawHostname.toLowerCase().split(":")[0].trim();

        
        // 2. Check Redis cache first: if found, return immediately! (< 2ms)
        const inRedis = await this.redis.get<ResolvedStore>(this.getCacheKey(hostname));

        if(inRedis){
            //@ts-ignore
            return inRedis
        }

        // 3. Cache Miss:
        //    a. Check if it's a Custom Domain in database (repository.findDomainByHostname)
        const customDomain = await this.repository.findDomainByHostname(hostname)

        if(customDomain){
            const resolved: ResolvedStore = {
                storeId: customDomain.store.id,
                storeSlug : customDomain.store.slug,
                storeName: customDomain.store.name,
                hostname
            }
            await this.redis.set(this.getCacheKey(hostname), resolved, 86400)
            return resolved
        }
        
        //    b. If not custom domain: extract subdomain slug (e.g. "fresh-bakery" from "fresh-bakery.sellvia.com" or "fresh-bakery.localhost")
        //       and query repository.findStoreBySlug
        const candidateSlug = hostname.includes(".") ? hostname.split(".")[0] : hostname;


        const store = await this.repository.findStoreBySlug(candidateSlug);
        if (store) {
            const resolved: ResolvedStore = {
                storeId: store.id,
                storeSlug: store.slug,
                storeName: store.name,
                hostname,
            };
            await this.redis.set(this.getCacheKey(hostname), resolved, 86400); // 24-hr cache
            return resolved;
        }
        
        const redirect = await this.repository.findSlugRedirect(candidateSlug);
        if (redirect && redirect.store) {
            const resolved: ResolvedStore = {
                storeId: redirect.store.id,
                storeSlug: redirect.store.slug,
                storeName: redirect.store.name,
                hostname,
            };
            await this.redis.set(this.getCacheKey(hostname), resolved, 3600); // 1-hr cache
            return resolved;
        }


        throw new NotFoundException(`No store found for domain: ${hostname}`);

    }

    // Merchant Management (Flow 2)
    async addDomain(storeId: number, userId: number, input: CreateDomainInput) {
     
        const store = await this.repository.findStoreById(storeId)
        if(!store || store.ownerUserId !== userId){
            throw new BadRequestException("Either store not found or you are not the owner of this store")
        }


        const hostname = input.hostname.toLowerCase().trim()
        const RESERVED = ["api", "admin", "app", "auth", "mail", "sellvia", "localhost", "www"];
        const baseName = hostname.split(".")[0];
        if (RESERVED.includes(baseName)) {
            throw new BadRequestException(`Domain name "${baseName}" is reserved by the platform`);
        }

        const existingDomain = await this.repository.findDomainByHostname(hostname);
        if (existingDomain) {
            throw new BadRequestException("This domain is already registered to another store");
        }

        const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
        const pastRedirect = await this.repository.findSlugRedirect(baseName);

        if (pastRedirect && pastRedirect.storeId !== storeId) {
            const isUnderCooldown = Date.now() - pastRedirect.createdAt.getTime() < COOLDOWN_MS;
            if (isUnderCooldown) {
                throw new BadRequestException(
                    "This domain was recently released by another store and is under a 30-day cooldown period",
                );
            }
        }


        const domain = await this.repository.createDomain(storeId, hostname);

        await this.redis.set(
            this.getCacheKey(hostname),
            {
                storeId: store.id,
                storeSlug: store.slug,
                storeName: store.name,
                hostname,
            },
            86400,
        );

        return domain;

    }

    async getStoreDomains(storeId: number, userId: number) {
        const store = await this.repository.findStoreById(storeId);
        if (!store || store.ownerUserId !== userId) {
            throw new ForbiddenException("You are not the owner of this store");
        }
        return await this.repository.findDomainsByStoreId(storeId);
    }

    async removeDomain(storeId: number, domainId: number, userId: number) {
        const store = await this.repository.findStoreById(storeId);
        if (!store || store.ownerUserId !== userId) {
            throw new ForbiddenException("You are not the owner of this store");
        }

        const domain = await this.repository.findDomainById(domainId);
        if (!domain || domain.storeId !== storeId) {
            throw new NotFoundException("Domain not found for this store");
        }

        await this.repository.deleteDomain(domainId);
        // Invalidate Redis cache so it no longer routes to this store!
        await this.redis.del(this.getCacheKey(domain.hostname));
        return { success: true };

    }
}
