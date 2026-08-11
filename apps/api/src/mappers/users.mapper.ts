import { Prisma } from '@prisma/client';
import type { User } from '@notes/schemas';

type UserPayload = Prisma.UserGetPayload<{
    omit: {
        password: true
    }
}>;

export function toUserResponse(user: UserPayload): User {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toUserResponses(users: UserPayload[]): User[] {
  return users.map(toUserResponse);
}