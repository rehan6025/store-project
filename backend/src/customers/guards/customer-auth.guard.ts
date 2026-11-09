import {
    Injectable,
    UnauthorizedException,
    type CanActivate,
    type ExecutionContext,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { CustomerJwtPayload } from "../customers.types.js";

export interface AuthenticatedCustomerRequest extends Request {
    customer?: CustomerJwtPayload;
}

@Injectable()
export class CustomerAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedCustomerRequest>();
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Missing or invalid authorization header");
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            throw new UnauthorizedException("Missing token");
        }

        try {
            const payload = await this.jwtService.verifyAsync<CustomerJwtPayload>(token);

            //  Role verification
            if (payload.role !== "CUSTOMER") {
                throw new UnauthorizedException("Customer access required");
            }

            // Multi-tenant fence: verify customer belongs to the store in the route
            if (request.params.storeId) {
                const routeStoreId = Number(request.params.storeId);
                if (payload.storeId !== routeStoreId) {
                    throw new UnauthorizedException("Token is not valid for this store");
                }
            }

            request.customer = payload;
            return true;
        } catch {
            throw new UnauthorizedException("Invalid or expired token");
        }
    }
}