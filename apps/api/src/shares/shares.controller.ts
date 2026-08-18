import { Controller, Req, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { Request } from 'express';

import { sharesContract } from '@notes/contracts';

import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';
import { NotesService } from 'src/notes/notes.service';

type AuthenticatedRequest = Request & { user?: { userId: number } };

@Controller()
@UseGuards(OptionalJwtAuthGuard)
export class SharesController {
  constructor(private readonly notesService: NotesService) {}

  @TsRestHandler(sharesContract)
  async handler(@Req() request: AuthenticatedRequest) {
    return tsRestHandler(sharesContract, {
      getByToken: async ({ params }) => {
        const result = await this.notesService.getShare(params.token, request.user?.userId);
        if (result.kind === 'ok') return { status: 200, body: result.note };
        if (result.kind === 'unauthenticated') return { status: 401, body: { code: 'unauthorized' } };
        if (result.kind === 'expired') return { status: 410, body: { code: 'share_expired' } };
        return { status: 404, body: { code: 'share_unavailable' } };
      },
    });
  }
}
