import {
  UseGuards,
  Get,
  Patch,
  Body,
  Request,
  Controller,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

import { ZodBody } from 'src/common/decorators/zod.decorator';
import { type UpdateUser } from '@notes/schemas';
import { tsRestHandler, TsRestHandler } from '@ts-rest/nest';

import { usersContract } from '@notes/contracts';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { toUserResponse } from 'src/mappers/users.mapper';
import { ProfileImageService } from './profile-image.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly profileImageService: ProfileImageService,
  ) {}

  @TsRestHandler(usersContract)
  async handler(@CurrentUserId() userId: number) {
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
      createProfileImageUpload: async ({ body }) => ({
        status: 201,
        body: await this.profileImageService.createUpload(userId, body),
      }),
      completeProfileImageUpload: async ({ body }) => ({
        status: 200,
        body: toUserResponse(
          await this.usersService.completeProfileImageUpload(userId, body.key),
        ),
      }),
      deleteProfileImage: async () => ({
        status: 200,
        body: toUserResponse(await this.usersService.removeProfileImage(userId)),
      }),
      searchByUsername: async ({ query }) => ({
        status: 200,
        body: await this.usersService.searchByUsername(query.query, userId),
      }),
    });
  }
}
