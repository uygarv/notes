import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OAuthProfile } from 'src/auth/interfaces/oauth-profile.interface';
import { OAuthProvider } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

import type { UpdateUser } from '@notes/schemas';

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

    async findPasswordResetUser(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                password: true,
            },
        });
    }

    async findById(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException({ code: 'unauthorized' });
        }

        return user
    }

    async create(email: string, password: string) {
        const hash = await bcrypt.hash(password, 10);
        return this.createWithEmailUsername({
            email,
            password: hash,
        });
    }

    private async createWithEmailUsername(data: Prisma.UserCreateInput) {
        const usernameBase = data.email.split('@')[0] || 'user';

        for (let attempt = 0; attempt < 100; attempt += 1) {
            const username = attempt === 0 ? usernameBase : `${usernameBase}-${attempt + 1}`;

            try {
                return await this.prisma.user.create({
                    data: {
                        ...data,
                        username,
                    },
                });
            } catch (error) {
                const target = error instanceof Prisma.PrismaClientKnownRequestError
                    ? error.meta?.target
                    : undefined;
                const conflictingFields = Array.isArray(target) ? target : [target];

                if (
                    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
                    error.code !== 'P2002' ||
                    !conflictingFields.includes('username')
                ) {
                    throw error;
                }
            }
        }

        throw new ConflictException({ code: 'username_taken' });
    }

    async updateUser(user: UpdateUser, userId: number) {
        if (user.username) {
            const existingUser = await this.prisma.user.findUnique({
                where: { username: user.username },
            });

            if (existingUser && existingUser.id !== userId) {
                throw new ConflictException({ code: 'username_taken' });
            }
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: user,
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
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        const { password: _, ...result } = user;
        return result;
    }

    async resetPassword(userId: number, password: string) {
      const hash = await bcrypt.hash(password, 10);

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hash,
                tokenVersion: { increment: 1 },
            },
            omit: {
                password: true,
            },
        });
    }

    async changePassword(userId: number, currentPassword: string | undefined, newPassword: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                password: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException({ code: 'unauthorized' });
        }

        if (!user.password) {
            return this.prisma.user.update({
                where: { id: userId },
                data: {
                    password: await bcrypt.hash(newPassword, 10),
                    tokenVersion: { increment: 1 },
                },
                omit: {
                    password: true,
                },
            });
        }

        if (!currentPassword || !await bcrypt.compare(currentPassword, user.password)) {
            throw new UnauthorizedException({ code: 'current_password_invalid' });
        }

        if (await bcrypt.compare(newPassword, user.password)) {
            throw new BadRequestException({ code: 'password_unchanged' });
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                password: await bcrypt.hash(newPassword, 10),
                tokenVersion: { increment: 1 },
            },
            omit: {
                password: true,
            },
        });
    }

    async isTokenVersionCurrent(userId: number, tokenVersion: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { tokenVersion: true },
        });

        return user?.tokenVersion === tokenVersion;
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

        return this.createWithEmailUsername({
            email,
            password: null,
            identities: {
                create: {
                    provider,
                    providerId,
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
                });
            }

            throw new ConflictException({
                code: 'already_connected',
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
