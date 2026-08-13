import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';

import { tagsContract } from '@notes/contracts';

import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { TagsService } from './tags.service';

import { toTagResponse, toTagResponses, toTagWithNotesResponse } from 'src/mappers/tags.mapper';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller()
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
  ) {}

  @TsRestHandler(tagsContract)
  async handler( @CurrentUserId() userId: number ) {
    return tsRestHandler(tagsContract, {
      findAll: async () => {
        const tags = await this.tagsService.findAll(userId);

        return {
          status: 200,
          body: toTagResponses(tags),
        };
      },

      findOne: async ({ params }) => {
        const tag = await this.tagsService.findOne(
          params.id,
          userId,
        );

        if (!tag) {
          return {
            status: 404,
            body: {
              code: 'tag_not_found',
            },
          };
        }

        return {
          status: 200,
          body: toTagWithNotesResponse(tag),
        };
      },

      create: async ({ body }) => {
        const tag = await this.tagsService.create(
          body,
          userId,
        );

        return {
          status: 201,
          body: toTagResponse(tag),
        };
      },

      update: async ({ params, body }) => {
        const tag = await this.tagsService.update(
          params.id,
          body,
          userId,
        );

        return {
          status: 200,
          body: toTagResponse(tag),
        };
      },

      delete: async ({ params }) => {
        const tag = await this.tagsService.delete(
          params.id,
          userId,
        );

        return {
          status: 200,
          body: toTagResponse(tag),
        };
      },
    });
  }
}
