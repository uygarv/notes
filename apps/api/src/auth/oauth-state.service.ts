import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';

import { RedisService } from '../redis/redis.service';
import { OAuthProvider, OAuthStateType } from '../constants';

interface OAuthState {
    type: OAuthStateType;
    provider: OAuthProvider;
    userId?: number;
}

@Injectable()
export class OAuthStateService {
    constructor(
        private readonly redis: RedisService,
    ) {}

    async createState(data: OAuthState): Promise<string> {
        const state = randomBytes(32).toString('hex');

        await this.redis.set(
            `oauth:state:${state}`,
            JSON.stringify(data),
            300,
        );

        return state;
    }

    async consumeState(state: string): Promise<OAuthState> {
        const key = `oauth:state:${state}`;

        const value = await this.redis.get(key);

        if (!value) {
            throw new UnauthorizedException(
                'Invalid or expired OAuth state',
            );
        }

        await this.redis.delete(key);

        return JSON.parse(value);
    }
}