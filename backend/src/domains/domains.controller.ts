import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { DomainsService } from "./domains.service.js";
import type { CreateDomainInput } from "./domains.types.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { JwtPayload } from "../auth/auth.types.js";

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
    @UseGuards(JwtAuthGuard)
    @Post("stores/:storeId/domains")
    addDomain(
        @Param("storeId") storeId: string,
        @CurrentUser() user: JwtPayload,
        @Body() body: CreateDomainInput,
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.domainsService.addDomain(Number(storeId), currentUserId, body);
    }

    // Protected: Merchant lists all custom domains for their store
    // GET /stores/:storeId/domains
    @UseGuards(JwtAuthGuard)
    @Get("stores/:storeId/domains")
    getStoreDomains(
        @Param("storeId") storeId: string,
        @CurrentUser() user: JwtPayload,
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.domainsService.getStoreDomains(Number(storeId), currentUserId);
    }

    // Protected: Merchant removes a custom domain
    // DELETE /stores/:storeId/domains/:domainId
    @UseGuards(JwtAuthGuard)
    @Delete("stores/:storeId/domains/:domainId")
    removeDomain(
        @Param("storeId") storeId: string,
        @Param("domainId") domainId: string,
        @CurrentUser() user: JwtPayload,
    ) {
        const currentUserId = user ? Number(user.sub) : 1;
        return this.domainsService.removeDomain(
            Number(storeId),
            Number(domainId),
            currentUserId,
        );
    }
}
