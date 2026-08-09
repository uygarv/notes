import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly redis: Redis;

    constructor() {
        const redisUrl = process.env.REDIS_URL;

        if (!redisUrl) {
            throw new Error('REDIS_URL is not defined');
        }

        this.redis = new Redis(redisUrl);
    }

    async set(
        key: string,
        value: string,
        ttlSeconds: number,
    ) {
        await this.redis.set(
            key,
            value,
            'EX',
            ttlSeconds,
        );
    }

    async get(key: string) {
        return this.redis.get(key);
    }

    async getAndDelete(key: string) {
        return this.redis.getdel(key);
    }

    async delete(key: string) {
        await this.redis.del(key);
    }

    async onModuleDestroy() {
        await this.redis.quit();
    }
}