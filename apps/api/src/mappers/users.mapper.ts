import type { User as PrismaUser } from '@prisma/client';
import type { User } from '@notes/schemas';

type UserPayload = Pick<
  PrismaUser,
  'id' | 'email' | 'username' | 'profileImageUrl' | 'password' | 'createdAt'
>;

export function toUserResponse(user: UserPayload): User {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    profileImageUrl: user.profileImageUrl,
    hasPassword: Boolean(user.password),
    createdAt: user.createdAt.toISOString(),
  };
}

export function toUserResponses(users: UserPayload[]): User[] {
  return users.map(toUserResponse);
}
