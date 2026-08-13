import { initContract } from '@ts-rest/core';
import {
  createUserSchema,
  userSchema,
  loginSchema,
  errorSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validationErrorSchema,
} from '@notes/schemas';

const c = initContract();

export const authContract = c.router({
  login: {
    method: 'POST',
    path: '/auth/login',
    body: loginSchema,
    responses: {
      204: c.noBody(),
      400: validationErrorSchema,
      401: errorSchema,
    },
  },

  signUp: {
    method: 'POST',
    path: '/auth/sign-up',
    body: createUserSchema,
    responses: {
      201: userSchema,
      400: validationErrorSchema,
      409: errorSchema,
    },
  },

  forgotPassword: {
    method: 'POST',
    path: '/auth/forgot-password',
    body: forgotPasswordSchema,
    responses: {
      204: c.noBody(),
      400: validationErrorSchema,
    },
  },

  resetPassword: {
    method: 'POST',
    path: '/auth/reset-password',
    body: resetPasswordSchema,
    responses: {
      204: c.noBody(),
      400: errorSchema,
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
