import { initContract } from '@ts-rest/core';
import {
  createUserSchema,
  userSchema,
  loginSchema,
  errorSchema,
} from '@notes/schemas';

const c = initContract();

export const authContract = c.router({
  login: {
    method: 'POST',
    path: '/auth/login',
    body: loginSchema,
    responses: {
      204: c.noBody(),
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

  logout: {
    method: 'POST',
    path: '/auth/logout',
    body: c.noBody(),
    responses: {
      204: c.noBody(),
      401: errorSchema,
    },
  },
});
