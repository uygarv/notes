import { Body, Controller, Get, Post, Param, ParseIntPipe, NotFoundException, Delete, Patch, UseGuards, Request } from '@nestjs/common';
import { NotesService } from './notes.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';

import { notesContract } from '@notes/contracts';

import { ZodBody } from 'src/common/decorators/zod.decorator';
import { createNoteSchema, updateNoteSchema, type CreateNote, type UpdateNote } from '@notes/schemas';
import { toNoteResponse, toNoteResponses } from '../mappers/notes.mapper';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller()
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @TsRestHandler(notesContract)
  async handler(@CurrentUserId() userId: number) {
    return tsRestHandler(notesContract, {
      findAll: async () => {
        const notes = await this.notesService.findAll(userId);

        return {
          status: 200,
          body: toNoteResponses(notes),
        };
      },

      findOne: async ({ params }) => {
        const note = await this.notesService.findOne(params.id, userId);

        if (!note) {
          return {
            status: 404,
            body: {
              code: 'note_not_found',
            },
          };
        }

        return {
          status: 200,
          body: toNoteResponse(note),
        };
      },

      create: async ({ body }) => {
        const note = await this.notesService.create(body, userId);

        return {
          status: 201,
          body: toNoteResponse(note),
        };
      },

      update: async ({ params, body }) => {
        const note = await this.notesService.update(
          params.id,
          body,
          userId,
        );

        return {
          status: 200,
          body: toNoteResponse(note),
        };
      },

      delete: async ({ params }) => {
        const note = await this.notesService.delete(params.id, userId);

        return {
          status: 200,
          body: toNoteResponse(note),
        };
      },
    });
  }
}
