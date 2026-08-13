import { initContract } from '@ts-rest/core';

import {
  userSchema,
  identityProviderSchema,
  updateUserSchema,
  validationErrorSchema,
  errorSchema,
} from '@notes/schemas';

const c = initContract();

export const usersContract = c.router({
  getMe: {
    method: 'GET',
    path: '/users/me',
    responses: {
      200: userSchema,
      401: errorSchema,
    },
  },

  getIdentityProviders: {
    method: 'GET',
    path: '/users/me/identities',
    responses: {
      200: identityProviderSchema.array(),
      401: errorSchema,
    },
  },

  updateMe: {
    method: 'PATCH',
    path: '/users/me',
    body: updateUserSchema,
    responses: {
      200: userSchema,
      400: validationErrorSchema,
      401: errorSchema,
      409: errorSchema,
    },
  },
});
