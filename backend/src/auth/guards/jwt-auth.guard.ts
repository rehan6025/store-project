import {
    
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import type {CanActivate,
    ExecutionContext,} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { JwtPayload } from "../auth.types.js";

export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Missing or invalid authorization header");
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            throw new UnauthorizedException("Missing token");
        }

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
            request.user = payload;
            return true;
        } catch {
            throw new UnauthorizedException("Invalid or expired token");
        }
    }
}
