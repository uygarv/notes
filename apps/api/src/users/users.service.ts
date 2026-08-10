import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OAuthProfile } from 'src/auth/interfaces/oauth-profile.interface';
import { OAuthProvider } from 'src/constants';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';


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

    async findById(userId: number) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            omit: {
                password: true,
            },
        });
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

    async updateUser(user: UpdateUserDto, userId: number) {
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

    async validateCredentials(email: string, password: string) {
        const user = await this.findByEmail(email);

        if (!user || !user.password) {
            return null;
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
                throw new BadRequestException(
                    'This account is already linked.',
                );
            }

            throw new BadRequestException(
                'This account is already linked to another user.',
            );
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

