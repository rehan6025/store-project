import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    type OnModuleDestroy,
    type OnModuleInit,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Queue, Worker } from "bullmq";
import { RedisService } from "../redis/redis.service.js";
import { FlashSalesRepository } from "./flash-sales.repository.js";
import type { CreateFlashSaleInput } from "./dto/create-flash-sale.dto.js";
import type { ReserveFlashSaleInput } from "./dto/reserve-flash-sale.dto.js";
import type {
    FlashSaleExpirationJob,
    FlashSaleReservationJob,
    ReserveResponse,
} from "./flash-sales.types.js";

const LUA_RESERVE_SCRIPT = `
local stock = tonumber(redis.call('get', KEYS[1]))
local requested = tonumber(ARGV[1])
if stock and stock >= requested then
    redis.call('decrby', KEYS[1], requested)
    return 1
else
    return 0
end
`;

@Injectable()
export class FlashSalesService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(FlashSalesService.name);
    private reservationQueue?: Queue;
    private expirationQueue?: Queue;
    private reservationWorker?: Worker;
    private expirationWorker?: Worker;

    constructor(
        private readonly repository: FlashSalesRepository,
        private readonly redis: RedisService,
    ) { }

    async onModuleInit() {
        if (process.env.NODE_ENV === "test") {
            return;
        }

        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
        const url = new URL(redisUrl);
        const connection = {
            host: url.hostname || "localhost",
            port: Number(url.port) || 6379,
        };

        try {
            this.reservationQueue = new Queue("flash-sale-reservations", { connection });
            this.expirationQueue = new Queue("flash-sale-expirations", { connection });

            this.reservationWorker = new Worker(
                "flash-sale-reservations",
                async (job) => {
                    await this.processReservationJob(job.data as FlashSaleReservationJob);
                },
                { connection, concurrency: 10 },
            );

            this.expirationWorker = new Worker(
                "flash-sale-expirations",
                async (job) => {
                    await this.processExpirationJob(job.data as FlashSaleExpirationJob);
                },
                { connection, concurrency: 10 },
            );

            this.reservationWorker.on("failed", (job, err) => {
                this.logger.error(`Reservation job ${job?.id} failed: ${err.message}`);
            });

            this.expirationWorker.on("failed", (job, err) => {
                this.logger.error(`Expiration job ${job?.id} failed: ${err.message}`);
            });
        } catch (error: any) {
            this.logger.warn(`Failed to initialize BullMQ workers: ${error.message}`);
        }
    }

    async onModuleDestroy() {
        await this.reservationWorker?.close();
        await this.expirationWorker?.close();
        await this.reservationQueue?.close();
        await this.expirationQueue?.close();
    }

    async createFlashSale(storeId: number, userId: number, input: CreateFlashSaleInput) {

        const startsAt = new Date(input.startsAt);
        const endsAt = new Date(input.endsAt);
        const now = new Date();

        if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
            throw new BadRequestException("Invalid startsAt or endsAt date format");
        }
        if (startsAt >= endsAt) {
            throw new BadRequestException("startsAt must be before endsAt");
        }
        if (endsAt <= now) {
            throw new BadRequestException("endsAt must be in the future");
        }

        const product = await this.repository.findProduct(storeId, input.productId);
        if (!product) {
            throw new NotFoundException("Product not found in this store");
        }

        const productPrice = Number(product.price);
        if (input.salePrice <= 0 || input.salePrice >= productPrice) {
            throw new BadRequestException("salePrice must be greater than 0 and less than product price");
        }

        const availableInventory = product.inventories?.stockCount ?? 0;
        if (input.stockLimit <= 0 || input.stockLimit > availableInventory) {
            throw new BadRequestException("stockLimit must be greater than 0 and cannot exceed available product inventory");
        }

        const flashSale = await this.repository.createFlashSale({
            storeId,
            productId: input.productId,
            startsAt,
            endsAt,
            salePrice: input.salePrice,
            stockLimit: input.stockLimit,
        });

        if (startsAt <= now && endsAt >= now) {
            await this.redis.set(`flashsale:stock:${flashSale.id}`, flashSale.stockLimit);
        }

        await this.redis.del(`store:flashsales:active:${storeId}`);

        return flashSale;
    }

    async getStoreFlashSales(storeId: number, userId: number) {

        return this.repository.findFlashSalesByStore(storeId);
    }

    async getActiveFlashSales(storeId: number) {
        const cacheKey = `store:flashsales:active:${storeId}`;
        const cached = await this.redis.get<any[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const activeSales = await this.repository.findActiveFlashSales(storeId, new Date());
        await this.redis.set(cacheKey, activeSales, 30);
        return activeSales;
    }

    async reserveStock(
        storeId: number,
        saleId: number,
        customerId: number,
        input: ReserveFlashSaleInput,
    ): Promise<ReserveResponse> {
        const quantity = input.quantity ?? 1;
        if (quantity <= 0) {
            throw new BadRequestException("Quantity must be at least 1");
        }

        const sale = await this.repository.findFlashSaleById(storeId, saleId);
        if (!sale) {
            throw new NotFoundException("Flash sale not found");
        }

        const now = new Date();
        if (now < sale.startsAt) {
            throw new BadRequestException("Flash sale has not started yet");
        }
        if (now > sale.endsAt) {
            throw new BadRequestException("Flash sale has already ended");
        }

        const stockKey = `flashsale:stock:${saleId}`;

        let currentStock = await this.redis.get<number>(stockKey);
        if (currentStock === null) {
            const remaining = sale.stockLimit - sale.soldQuantity - sale.reservationQuantity;
            if (remaining <= 0) {
                throw new BadRequestException("Sold out");
            }
            await this.redis.set(stockKey, remaining);
        }

        const luaResult = await this.redis.eval(LUA_RESERVE_SCRIPT, [stockKey], [quantity.toString()]);
        if (luaResult !== 1) {
            throw new BadRequestException("Sold out or insufficient stock");
        }

        const reservationToken = `res_${randomUUID()}`;
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const reservationPayload: FlashSaleReservationJob = {
            flashSaleId: saleId,
            customerId,
            quantity,
            reservationToken,
            expiresAt: expiresAt.toISOString(),
        };

        if (this.reservationQueue) {
            await this.reservationQueue.add("create-reservation", reservationPayload);
        } else {
            await this.processReservationJob(reservationPayload);
        }

        return {
            status: "RESERVED",
            reservationToken,
            flashSaleId: saleId,
            quantity,
            expiresInSeconds: 600,
            expiresAt: expiresAt.toISOString(),
        };
    }

    async processReservationJob(data: FlashSaleReservationJob) {
        const reservation = await this.repository.createReservation({
            flashSaleId: data.flashSaleId,
            customerId: data.customerId,
            quantity: data.quantity,
            expiresAt: new Date(data.expiresAt),
        });

        const expirationPayload: FlashSaleExpirationJob = {
            reservationId: reservation.id,
            flashSaleId: data.flashSaleId,
            quantity: data.quantity,
        };

        if (this.expirationQueue) {
            await this.expirationQueue.add("expire-reservation", expirationPayload, {
                delay: 10 * 60 * 1000,
                jobId: `expire-res-${reservation.id}`,
            });
        }
    }

    async processExpirationJob(data: FlashSaleExpirationJob) {
        const expired = await this.repository.expireReservation(
            data.reservationId,
            data.flashSaleId,
            data.quantity,
        );

        if (expired) {
            await this.redis.incrBy(`flashsale:stock:${data.flashSaleId}`, data.quantity);
            this.logger.log(`Restocked ${data.quantity} units for flash sale ${data.flashSaleId}`);
        }
    }
}

