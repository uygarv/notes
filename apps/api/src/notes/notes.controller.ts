import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';

import { notesContract } from '@notes/contracts';

import { CurrentUserId } from 'src/common/decorators/current-user-id.decorator';
import { toNoteResponse, toNoteResponses } from '../mappers/notes.mapper';
import { NotesService } from './notes.service';

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
        return { status: 200, body: toNoteResponses(notes, userId, (note, actorId) => this.notesService.accessFor(note, actorId)) };
      },
      findOne: async ({ params }) => {
        const note = await this.notesService.findOne(params.id, userId);
        if (!note) return { status: 404, body: { code: 'note_not_found' } };
        return { status: 200, body: toNoteResponse(note, this.notesService.accessFor(note, userId)) };
      },
      create: async ({ body }) => {
        const note = await this.notesService.create(body, userId);
        return { status: 201, body: toNoteResponse(note, this.notesService.accessFor(note, userId)) };
      },
      update: async ({ params, body }) => {
        const note = await this.notesService.update(params.id, body, userId);
        return { status: 200, body: toNoteResponse(note, this.notesService.accessFor(note, userId)) };
      },
      delete: async ({ params }) => {
        const note = await this.notesService.delete(params.id, userId);
        return { status: 200, body: toNoteResponse(note, this.notesService.accessFor(note, userId)) };
      },
      lock: async ({ params, body }) => {
        const note = await this.notesService.lock(params.id, body, userId);
        return { status: 200, body: toNoteResponse(note, this.notesService.accessFor(note, userId)) };
      },
      unlock: async ({ params, body }) => {
        const note = await this.notesService.unlock(params.id, body, userId);
        return { status: 200, body: toNoteResponse(note, this.notesService.accessFor(note, userId)) };
      },
      createCollaborationTicket: async ({ params }) => ({
        status: 200,
        body: await this.notesService.createCollaborationTicket(params.id, userId),
      }),
      getSharing: async ({ params }) => ({ status: 200, body: await this.notesService.getSharing(params.id, userId) }),
      createShareLink: async ({ params, body }) => ({ status: 201, body: await this.notesService.createShareLink(params.id, body, userId) }),
      deleteShareLink: async ({ params }) => ({ status: 200, body: await this.notesService.deleteShareLink(params.id, userId) }),
      addCollaborator: async ({ params, body }) => ({ status: 201, body: await this.notesService.addCollaborator(params.id, body, userId) }),
      updateCollaborator: async ({ params, body }) => ({ status: 200, body: await this.notesService.updateCollaborator(params.id, params.userId, body, userId) }),
      deleteCollaborator: async ({ params }) => {
        await this.notesService.deleteCollaborator(params.id, params.userId, userId);
        return { status: 204, body: undefined };
      },
    });
  }
}
