import "dotenv/config";
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;


@Injectable()
export class RedisService implements OnModuleInit,OnModuleDestroy{
    private readonly logger = new Logger(RedisService.name)
    private client!: RedisClient;

    async onModuleInit() {
        const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"
        this.client = createClient({ url : redisUrl})
        this.client.on("error", (error)=> this.logger.warn(`Redis connection error: ${error.message}`,))
        await this.client.connect()
    }

    async onModuleDestroy() {
        if(this.client){
            this.client.destroy()
        }   
    }

    async get<T>(key: string): Promise<T|null>{
        try {
            const data = await this.client.get(key)
            return data ? JSON.parse(data) : null
        } catch (error) {
            this.logger.error(`Failed to get cache for key ${key}`, error)
            return null; 
        }
    }

    async set(key: string, value: any, ttlInSeconds?: number):Promise<void> {
        try {
            const updatedValue = JSON.stringify(value)
            if(ttlInSeconds){
                await this.client.set(key , updatedValue, {expiration:{type:"EX", value:ttlInSeconds}})
            }else{
                await this.client.set(key, updatedValue)
            }
        } catch (error) {
            this.logger.error(`Failed to set cache for key ${key}`, error)
        }
    }

    async del(key: string): Promise<void>{
        try {
            await this.client.del(key)
        } catch (error) {
            this.logger.error(`Failed to delete cache for key ${key}`, error);
        }
    }

    async eval(script: string, keys: string[], args: string[]): Promise<any> {
        try {
            return await this.client.eval(script, {
                keys,
                arguments: args,
            });
        } catch (error) {
            this.logger.error(`Failed to execute lua script on keys ${keys.join(",")}`, error);
            throw error;
        }
    }

    async incrBy(key: string, amount: number): Promise<number> {
        try {
            return await this.client.incrBy(key, amount);
        } catch (error) {
            this.logger.error(`Failed to increment key ${key}`, error);
            throw error;
        }
    }

    getClient(): RedisClient {
        return this.client;
    }
}