import {
  UseGuards,
  Get,
  Patch,
  Body,
  Request,
  Controller,
  Res,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

import { ZodBody } from 'src/common/decorators/zod.decorator';
import { updateUserSchema, type UpdateUser } from '@notes/schemas';
import { tsRestHandler, TsRestHandler } from '@ts-rest/nest';

import { usersContract } from '@notes/contracts';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { toUserResponse } from 'src/mappers/users.mapper';
import { migrateSessionCookie } from 'src/auth/session-cookie';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @TsRestHandler(usersContract)
  async handler(
    @CurrentUserId() userId: number,
    @Request() request: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    migrateSessionCookie(response, request.cookies?.notes_access_token);
    return tsRestHandler(usersContract, {
      getMe: async () => {
        const user = await this.usersService.findById(userId);

        return {
          status: 200,
          body: toUserResponse(user),
        };
      },
      getIdentityProviders: async () => ({
        status: 200,
        body: await this.usersService.getIdentityProviders(userId),
      }),
      updateMe: async ({ body }) => {
        const user = await this.usersService.updateUser(body, userId);

        return {
          status: 200,
          body: toUserResponse(user),
        };
      },
    });
  }
}
