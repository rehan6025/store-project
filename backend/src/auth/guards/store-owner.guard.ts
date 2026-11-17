import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    type CanActivate,
    type ExecutionContext,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { Request } from "express";
import type { JwtPayload } from "../auth.types.js";

export interface AuthenticatedStoreRequest extends Request {
    user?: JwtPayload;
    store?: any;
}

@Injectable()
export class StoreOwnerGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedStoreRequest>();

        const storeId = Number(request.params.storeId);
        if (!storeId || isNaN(storeId)) {
            throw new BadRequestException("Invalid or missing storeId parameter");
        }

        const store = await this.prisma.store.findUnique({
            where: {
                id: storeId,
            }
        })

        if (!store) {
            throw new NotFoundException("Store not found")
        }

        if (store.ownerUserId !== Number(request.user?.sub)) {
            throw new ForbiddenException("Not authorized")
        }

        request.store = store

        return true;
    }
}

