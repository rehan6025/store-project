import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";


@Injectable()
export class DomainsRepository{
    constructor(private readonly prisma: PrismaService){}

    async findDomainByHostname(hostname: string) {
        return await this.prisma.domain.findUnique({
            where: { hostname },
            include: { store: true },
        });
    }

    async findStoreBySlug(slug: string) {
        return await this.prisma.store.findUnique({
            where: { slug },
        });
    }


    async findStoreById(storeId: number) {
        return await this.prisma.store.findUnique({
            where: { id: storeId },
        });
    }

    async findDomainsByStoreId(storeId: number) {
        return await this.prisma.domain.findMany({
            where: { storeId },
            orderBy: { createdAt: "desc" },
        });
    }


    async findDomainById(domainId: number) {
        return await this.prisma.domain.findUnique({
            where: { id: domainId },
        });
    }

    async createDomain(storeId: number, hostname: string){
        return await this.prisma.domain.create({
            data:{
                storeId,
                hostname
            }
        })
    }

    async deleteDomain(domainId: number) {
        return await this.prisma.domain.delete({
            where: { id: domainId },
        });
    }

    async findSlugRedirect(slug: string) {
        return await this.prisma.slugRedirect.findUnique({
            where: { slug },
            include: { store: true },
        });
    }

}