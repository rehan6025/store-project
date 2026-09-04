import "dotenv/config";
import {
    Injectable,
    type OnModuleDestroy,
    type OnModuleInit,
} from "@nestjs/common";
import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    constructor() {
        console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);

        const adapter = new PrismaPg({
            connectionString: process.env.DATABASE_URL,
        });

        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
