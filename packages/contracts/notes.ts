import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import {
  createNoteSchema,
  updateNoteSchema,
  lockNoteSchema,
  unlockNoteSchema,
  noteSchema,
  validationErrorSchema,
  errorSchema
} from '@notes/schemas';

const c = initContract();

export const notesContract = c.router({
  findAll: {
    method: 'GET',
    path: '/v1/notes',
    responses: {
      200: z.array(noteSchema),
      401: errorSchema,
    },
  },

  findOne: {
    method: 'GET',
    path: '/v1/notes/:id',
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    responses: {
      200: noteSchema,
      404: errorSchema,
      401: errorSchema,
    },
  },

  create: {
    method: 'POST',
    path: '/v1/notes',
    body: createNoteSchema,
    responses: {
      201: noteSchema,
      400: validationErrorSchema,
      401: errorSchema,
    },
  },

  update: {
    method: 'PATCH',
    path: '/v1/notes/:id',
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    body: updateNoteSchema,
    responses: {
      200: noteSchema,
      400: validationErrorSchema,
      401: errorSchema,
      404: errorSchema,
    },
  },

  delete: {
    method: 'DELETE',
    path: '/v1/notes/:id',
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    responses: {
      200: noteSchema,
      401: errorSchema,
      404: errorSchema,
    },
  },

  lock: {
    method: 'POST',
    path: '/v1/notes/:id/lock',
    pathParams: z.object({ id: z.coerce.number() }),
    body: lockNoteSchema,
    responses: { 200: noteSchema, 400: validationErrorSchema, 401: errorSchema, 404: errorSchema },
  },

  unlock: {
    method: 'POST',
    path: '/v1/notes/:id/unlock',
    pathParams: z.object({ id: z.coerce.number() }),
    body: unlockNoteSchema,
    responses: { 200: noteSchema, 400: validationErrorSchema, 401: errorSchema, 404: errorSchema },
  },
});
