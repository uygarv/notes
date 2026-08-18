import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { errorSchema, publicSharedNoteSchema } from '@notes/schemas';

const c = initContract();

export const sharesContract = c.router({
  getByToken: {
    method: 'GET',
    path: '/shares/:token',
    pathParams: z.object({ token: z.string().min(1) }),
    responses: {
      200: publicSharedNoteSchema,
      401: errorSchema,
      403: errorSchema,
      404: errorSchema,
      410: errorSchema,
    },
  },
});
