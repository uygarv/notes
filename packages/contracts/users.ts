import { initContract } from '@ts-rest/core';

import {
  userSchema,
  updateUserSchema,
  validationErrorSchema,
} from '@notes/schemas';

const c = initContract();

export const usersContract = c.router({
  getMe: {
    method: 'GET',
    path: '/users/me',
    responses: {
      200: userSchema,
    },
  },

  updateMe: {
    method: 'PATCH',
    path: '/users/me',
    body: updateUserSchema,
    responses: {
      200: userSchema,
      400: validationErrorSchema,
    },
  },
});