import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { AuthenticatedCustomerRequest } from "../guards/customer-auth.guard.js";
import type { CustomerJwtPayload } from "../customers.types.js";

export const CurrentCustomer = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): CustomerJwtPayload | undefined => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedCustomerRequest>();
        return request.customer;
    },
);