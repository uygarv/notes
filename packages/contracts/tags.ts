import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import {
  tagSchema,
  tagWithNotesSchema,
  createTagSchema,
  updateTagSchema,
  validationErrorSchema,
  errorSchema
} from '@notes/schemas';

const c = initContract();

export const tagsContract = c.router({
  findAll: {
    method: 'GET',
    path: '/v1/tags',
    responses: {
      200: z.array(tagSchema),
    },
  },

  findOne: {
    method: 'GET',
    path: '/v1/tags/:id',
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    responses: {
      200: tagWithNotesSchema,
      404: errorSchema,
    },
  },

  create: {
    method: 'POST',
    path: '/v1/tags',
    body: createTagSchema,
    responses: {
      201: tagSchema,
      400: validationErrorSchema,
    },
  },

  update: {
    method: 'PATCH',
    path: '/v1/tags/:id',
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    body: updateTagSchema,
    responses: {
      200: tagSchema,
      400: validationErrorSchema,
    },
  },

  delete: {
    method: 'DELETE',
    path: '/v1/tags/:id',
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    responses: {
      200: tagSchema,
    },
  },
});