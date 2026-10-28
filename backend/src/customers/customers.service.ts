import "dotenv/config"
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CustomersRepository } from "./customers.repository.js";
import argon2 from "argon2";

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

const PEPPER = Buffer.from(process.env.PASSWORD_PEPPER || "", 'utf-8');

@Injectable()
export class CustomersService {
    constructor(private readonly customersRepository: CustomersRepository) {}

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


    async registerCustomer(storeId: number, input: RegisterCustomerInput) {
        const store = await this.customersRepository.getStore(storeId);
        if(!store){
            throw new NotFoundException("Store not found.")
        }
        const normalizedEmail = input.email.trim().toLowerCase()
       
        const existingCustomer = await this.customersRepository.findCustomerByEmail(storeId,normalizedEmail)

        if(existingCustomer){
            throw new BadRequestException("Email already exists in this store")
        }
        
        if(input.password){
            input.password = await argon2.hash(input.password,{
                type: argon2.argon2id,
                secret: PEPPER
            })
        }       
        
        const customer = await this.customersRepository.createCustomer(storeId, {
            name: input.name,
            email: normalizedEmail,
            phone: input.phone,
            address: input.address,
            passwordHash: input.password || null
        })
        return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
        }
    }

    async updateCustomer(storeId: number, customerId: number, input: UpdateCustomerInput) {
        const store = await this.customersRepository.getStore(storeId)
        if(!store ){
            throw new NotFoundException("Store not found")
        }

        const existingCustomer = await this.customersRepository.findCustomerById(storeId, customerId)
        if(!existingCustomer){
            throw new NotFoundException("Customer not found")
        }
        
        if(input.email){
            const normalizedEmail = input.email.trim().toLowerCase()
            const existingCustomer = await this.customersRepository.findCustomerByEmail(storeId,normalizedEmail)
            if(existingCustomer && existingCustomer.id !== customerId){
                throw new BadRequestException("Email already exists in this store")
            }
        }
        
        if(input.email){
            input.email = input.email.trim().toLowerCase()
        }
        if(input.phone){
            input.phone = input.phone.trim()
        }
        if(input.address){
            input.address = input.address.trim()
        }
        if(input.name){
            input.name = input.name.trim()
        }
        const updatedCustomer = await this.customersRepository.updateCustomer(storeId, customerId, input)
        return {
            id: updatedCustomer.id,
            name: updatedCustomer.name,
            email: updatedCustomer.email,
            phone: updatedCustomer.phone,
            address: updatedCustomer.address,
        }
    }
}
