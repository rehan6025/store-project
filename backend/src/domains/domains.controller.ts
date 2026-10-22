import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    Param,
    Post,
    Query,
} from "@nestjs/common";
import { DomainsService } from "./domains.service.js";
import type { CreateDomainInput } from "./domains.types.js";

@Controller()
export class DomainsController {
    constructor(private readonly domainsService: DomainsService) {}

    // Public: Frontend resolves visitor's hostname
    // GET /domains/resolve?hostname=rehan-bakery.sellvia.com
    @Get("domains/resolve")
    resolveHostname(@Query("hostname") hostname: string) {
        return this.domainsService.resolveHostname(hostname);
    }

    // Protected: Merchant adds a custom domain
    // POST /stores/:storeId/domains
    @Post("stores/:storeId/domains")
    addDomain(
        @Param("storeId") storeId: string,
        @Headers("x-user-id") userId: string,
        @Body() body: CreateDomainInput,
    ) {
        const currentUserId = userId ? Number(userId) : 1;
        return this.domainsService.addDomain(Number(storeId), currentUserId, body);
    }

    // Protected: Merchant lists all custom domains for their store
    // GET /stores/:storeId/domains
    @Get("stores/:storeId/domains")
    getStoreDomains(
        @Param("storeId") storeId: string,
        @Headers("x-user-id") userId: string,
    ) {
        const currentUserId = userId ? Number(userId) : 1;
        return this.domainsService.getStoreDomains(Number(storeId), currentUserId);
    }

    // Protected: Merchant removes a custom domain
    // DELETE /stores/:storeId/domains/:domainId
    @Delete("stores/:storeId/domains/:domainId")
    removeDomain(
        @Param("storeId") storeId: string,
        @Param("domainId") domainId: string,
        @Headers("x-user-id") userId: string,
    ) {
        const currentUserId = userId ? Number(userId) : 1;
        return this.domainsService.removeDomain(
            Number(storeId),
            Number(domainId),
            currentUserId,
        );
    }
}
