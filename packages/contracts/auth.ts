import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import {
  createUserSchema,
  userSchema,
  loginSchema,
  errorSchema
} from '@notes/schemas';

const c = initContract();

const loginResponseSchema = z.object({
  access_token: z.string(),
});

export const authContract = c.router({
  login: {
    method: 'POST',
    path: '/auth/login',
    body: loginSchema,
    responses: {
      200: loginResponseSchema,
      401: errorSchema,
    },
  },

  signUp: {
    method: 'POST',
    path: '/auth/sign-up',
    body: createUserSchema,
    responses: {
      201: userSchema,
      409: errorSchema,
    },
  },
});