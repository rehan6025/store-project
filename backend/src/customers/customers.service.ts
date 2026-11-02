import "dotenv/config";
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { hash, verify } from "@node-rs/argon2";
import { CustomersRepository } from "./customers.repository.js";
import type {
    CustomerAuthResponse,
    CustomerJwtPayload,
    LoginCustomerInput,
} from "./customers.types.js";

export type RegisterCustomerInput = {
    name: string;
    email: string;
    phone: string;
    address: string;
    password?: string;
};

export type UpdateCustomerInput = {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
};

const PEPPER = Buffer.from(process.env.PASSWORD_PEPPER || "", "utf-8");

@Injectable()
export class CustomersService {
    constructor(
        private readonly customersRepository: CustomersRepository,
        private readonly jwtService: JwtService,
    ) { }

    // Rote plumbing: Merchant views paginated customer list for their store
    async getCustomers(storeId: number, userId: number, limit = 20, offset = 0) {
        const store = await this.customersRepository.getStore(storeId);
        if (!store) {
            throw new NotFoundException("Store not found");
        }
        if (store.ownerUserId !== userId) {
            throw new ForbiddenException("You are not authorized to view customers of this store");
        }

        return await this.customersRepository.findManyByStore(storeId, limit, offset);
    }

    // Rote plumbing: Get single customer by ID
    async getCustomerById(storeId: number, customerId: number) {
        const customer = await this.customersRepository.findCustomerById(storeId, customerId);
        if (!customer) {
            throw new NotFoundException("Customer not found");
        }
        return customer;
    }

    // Shopper Registration: creates account and returns signed JWT
    async registerCustomer(
        storeId: number,
        input: RegisterCustomerInput,
    ): Promise<CustomerAuthResponse> {
        const store = await this.customersRepository.getStore(storeId);
        if (!store) {
            throw new NotFoundException("Store not found.");
        }
        const normalizedEmail = input.email.trim().toLowerCase();

        const existingCustomer = await this.customersRepository.findCustomerByEmail(
            storeId,
            normalizedEmail,
        );

        if (existingCustomer) {
            throw new BadRequestException("Email already exists in this store");
        }

        let passwordHash: string | null = null;
        if (input.password) {
            if (input.password.length < 6) {
                throw new BadRequestException("Password must be at least 6 characters");
            }
            passwordHash = await hash(input.password, { secret: PEPPER });
        }

        const customer = await this.customersRepository.createCustomer(storeId, {
            name: input.name.trim(),
            email: normalizedEmail,
            phone: input.phone.trim(),
            address: input.address.trim(),
            passwordHash,
        });

        const payload: CustomerJwtPayload = {
            sub: customer.id,
            email: customer.email,
            storeId,
            role: "CUSTOMER",
        };

        const accessToken = await this.jwtService.signAsync(payload);

        return {
            accessToken,
            customer: {
                id: customer.id,
                storeId: customer.storeId,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
            },
        };
    }

    // Shopper Login: verifies password and returns signed JWT
    async loginCustomer(
        storeId: number,
        input: LoginCustomerInput,
    ): Promise<CustomerAuthResponse> {
        const store = await this.customersRepository.getStore(storeId);
        if (!store) {
            throw new NotFoundException("Store not found.");
        }

        const normalizedEmail = input.email.trim().toLowerCase();
        const customer = await this.customersRepository.findCustomerByEmail(
            storeId,
            normalizedEmail,
        );

        if (!customer || !customer.passwordHash) {
            throw new UnauthorizedException("Invalid email or password");
        }

        const isPasswordValid = await verify(customer.passwordHash, input.password, {
            secret: PEPPER,
        });

        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid email or password");
        }

        const payload: CustomerJwtPayload = {
            sub: customer.id,
            email: customer.email,
            storeId,
            role: "CUSTOMER",
        };

        const accessToken = await this.jwtService.signAsync(payload);

        return {
            accessToken,
            customer: {
                id: customer.id,
                storeId: customer.storeId,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
            },
        };
    }

    async updateCustomer(storeId: number, customerId: number, input: UpdateCustomerInput) {
        const store = await this.customersRepository.getStore(storeId);
        if (!store) {
            throw new NotFoundException("Store not found");
        }

        const existingCustomer = await this.customersRepository.findCustomerById(storeId, customerId);
        if (!existingCustomer) {
            throw new NotFoundException("Customer not found");
        }

        if (input.email) {
            const normalizedEmail = input.email.trim().toLowerCase();
            const emailInUse = await this.customersRepository.findCustomerByEmail(storeId, normalizedEmail);
            if (emailInUse && emailInUse.id !== customerId) {
                throw new BadRequestException("Email already exists in this store");
            }
        }

        const updatedCustomer = await this.customersRepository.updateCustomer(storeId, customerId, {
            name: input.name ? input.name.trim() : undefined,
            email: input.email ? input.email.trim().toLowerCase() : undefined,
            phone: input.phone ? input.phone.trim() : undefined,
            address: input.address ? input.address.trim() : undefined,
        });

        return {
            id: updatedCustomer.id,
            name: updatedCustomer.name,
            email: updatedCustomer.email,
            phone: updatedCustomer.phone,
            address: updatedCustomer.address,
        };
    }
}