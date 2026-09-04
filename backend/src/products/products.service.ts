import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { ProductStatus } from "../../generated/prisma/enums.js";

export type GetProductsQuery = {
    limit?: number;
    offset?: number;
    status?: ProductStatus;
};

export type CreateProductInput = {
    name: string;
    slug: string;
    description: string;
    price: number; // or Decimal
    status?: ProductStatus;
    currency?: string; // defaults to 'INR'
    imageUrl?: string;
    initialStock?: number; // defaults to 0
    categoryIds?: number[];
};

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) {}

    // Rote plumbing: Fetch paginated products for a store with inventory
    async getProducts(storeId: number, query?: GetProductsQuery) {
        const limit = query?.limit ?? 20;
        const offset = query?.offset ?? 0;
        const status = query?.status ?? ProductStatus.ACTIVE;

        const products = await this.prisma.product.findMany({
            where: {
                storeId,
                status,
            },
            include: {
                inventories: true,
                productCategories: {
                    include: {
                        category: true,
                    },
                },
            },
            take: limit,
            skip: offset,
        });

        return products;
    }

    // Rote plumbing: Fetch a single product scoped to its store
    async getProductById(storeId: number, productId: number) {
        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                storeId,
            },
            include: {
                inventories: true,
                productCategories: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        if (!product) {
            throw new NotFoundException("Product not found");
        }

        return product;
    }

    async createProduct(storeId:number, userId:number, input: CreateProductInput){
        const store = await this.prisma.store.findUnique({
            where:{
                id: storeId
            }
        });

        if(!store){
            throw new NotFoundException("Store not found");
        }

        if(store.ownerUserId !== userId){
            throw new ForbiddenException("You are not the owner of this store");
        }

        const productWithSameSlug = await this.prisma.product.findFirst({
            where:{
                slug: input.slug,
                storeId
            }
        })
        if(productWithSameSlug){
            throw new BadRequestException("Product with same slug already exists")
        }

        return await this.prisma.$transaction(async (tx)=>{
            // 1) create the product
            const product = await tx.product.create({
                data: {
                    storeId,
                    name: input.name,
                    slug: input.slug.trim().toLowerCase(),
                    description: input.description,
                    price: input.price,
                    currency: input.currency ?? "INR",
                    imageUrl: input.imageUrl,
                    status: input.status ?? ProductStatus.ACTIVE,
                },
            });

            await tx.inventory.create({
                data:{
                    storeId,
                    productId: product.id,
                    stockCount:input.initialStock ?? 0
                }
            })

            if (input.categoryIds && input.categoryIds.length > 0) {
                await tx.productCategory.createMany({
                    data: input.categoryIds.map((categoryId) => ({
                        productId: product.id,
                        categoryId: categoryId,
                    })),
                });
            }

            return await tx.product.findUnique({
                where:{
                    id: product.id
                },
                include:{
                    inventories: true,
                    productCategories: true
                }
            })
   
        })
    }

    async archiveProduct(storeId: number, userId: number, productId: number){
        const store = await this.prisma.store.findUnique({
            where:{
                id: storeId
            }
        })

        if(!store){
            throw new NotFoundException("Store not found");
        }

        if(store.ownerUserId !== userId){
            throw new ForbiddenException("You are not the owner of this store");
        }

        const product = await this.prisma.product.findUnique({
            where:{
                id: productId,
                storeId
            }
        })

        if(!product){
            throw new NotFoundException("Product not found");
        }

        return await this.prisma.product.update({
            where:{
                id: productId
            },
            data:{
                status: ProductStatus.ARCHIVED
            }
        })
    }
}
