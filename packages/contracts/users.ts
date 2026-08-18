import { initContract } from '@ts-rest/core';

import {
  userSchema,
  identityProviderSchema,
  createProfileImageUploadSchema,
  profileImageUploadSchema,
  completeProfileImageUploadSchema,
  updateUserSchema,
  validationErrorSchema,
  errorSchema,
} from '@notes/schemas';
import { z } from 'zod';
import { usernameSearchResultSchema } from '@notes/schemas';

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
  createProfileImageUpload: {
    method: 'POST',
    path: '/users/me/profile-image/uploads',
    body: createProfileImageUploadSchema,
    responses: {
      201: profileImageUploadSchema,
      400: validationErrorSchema,
      401: errorSchema,
      503: errorSchema,
    },
  },
  completeProfileImageUpload: {
    method: 'POST',
    path: '/users/me/profile-image/uploads/complete',
    body: completeProfileImageUploadSchema,
    responses: {
      200: userSchema,
      400: validationErrorSchema,
      401: errorSchema,
      503: errorSchema,
    },
  },
  deleteProfileImage: {
    method: 'DELETE',
    path: '/users/me/profile-image',
    responses: {
      200: userSchema,
      401: errorSchema,
      503: errorSchema,
    },
  },
  searchByUsername: {
    method: 'GET',
    path: '/users/search',
    query: z.object({ query: z.string().trim().min(2).max(64) }),
    responses: {
      200: z.array(usernameSearchResultSchema),
      401: errorSchema,
    },
  },
});
