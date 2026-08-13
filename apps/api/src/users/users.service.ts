import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OAuthProfile } from 'src/auth/interfaces/oauth-profile.interface';
import { OAuthProvider } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';

import { type UpdateUser } from '@notes/schemas';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService
    ) {}

    // private because exposes password
    private async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async userExistsByEmail(email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
            },
        });

        return !!user;
    }

    async findAuthenticationMethods(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            select: {
                password: true,
                identities: { select: { provider: true } },
            },
        });
    }

    async findById(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            omit: {
                password: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException();
        }

        return user
    }

    async create(email: string, password: string) {
        const hash = await bcrypt.hash(password, 10);
        return this.prisma.user.create({
            data: {
                email,
                password: hash
            },
            omit: {
                password: true,
            },
        });
    }

    async updateUser(user: UpdateUser, userId: number) {
        if (user.username) {
            const existingUser = await this.prisma.user.findUnique({
                where: { username: user.username },
            });

            if (existingUser && existingUser.id !== userId) {
                throw new ConflictException('Username is already taken');
            }
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: user,
            omit: {
                password: true,
            },
        })
    }

    async getIdentityProviders(userId: number) {
        const identities = await this.prisma.identity.findMany({
            where: { userId },
            select: { provider: true },
        });
        const linkedProviders = new Set(identities.map((identity) => identity.provider));

        return Object.values(OAuthProvider).map((provider) => ({
            provider,
            linked: linkedProviders.has(provider),
        }));
    }

    async validateCredentials(email: string, password: string) {
        const user = await this.findByEmail(email);

        if (!user) {
            return null;
        }

        if (!user.password) {
            throw new UnauthorizedException({
                code: 'use_provider',
                message: 'This account uses a connected provider. Sign in with that provider instead.',
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        const { password: _, ...result } = user;
        return result;
    }

    async findByIdentity(provider: OAuthProvider, providerId: string) {
        return this.prisma.identity.findUnique({
            where: {
                provider_providerId: {
                    provider,
                    providerId,
                },
            },
            include: {
                user: true,
            },
        });
    }
    async createOAuthUser(profile: OAuthProfile) {
        const { email, provider, providerId } = profile;

        return this.prisma.user.create({
            data: {
                email,
                password: null,
                identities: {
                    create: {
                        provider,
                        providerId,
                    },
                },
            },
        });
    }

    async linkOAuthAccount(userId: number, profile: OAuthProfile) {
        const existingIdentity = await this.prisma.identity.findUnique({
            where: {
                provider_providerId: {
                    provider: profile.provider,
                    providerId: profile.providerId,
                },
            },
        });

        if (existingIdentity) {
            if (existingIdentity.userId === userId) {
                throw new BadRequestException({
                    code: 'already_linked',
                    message: 'This provider is already linked to your account.',
                });
            }

            throw new ConflictException({
                code: 'already_connected',
                message: 'This provider account is already connected to another Notes account.',
            });
        }

        return this.prisma.identity.create({
            data: {
                provider: profile.provider,
                providerId: profile.providerId,
                userId,
            },
        });
    }
}
