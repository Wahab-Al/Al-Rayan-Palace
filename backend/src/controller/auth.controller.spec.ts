
import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  CookieOptions,
  Request,
  Response,
} from 'express';

import config from '../config/env.js';

import {
  ADMIN_COOKIE_NAME,
} from '../services/auth.service.js';

import {
  createAuthController,
  type AuthControllerDependencies,
} from './auth.controller.js';


function createResponseMock() {
  const state = {
    statusCode: 200,
    body: undefined as unknown,

    cookieCall: undefined as
    | {
        name: string;
        value: string;
        options: CookieOptions | undefined;
      }
    | undefined,

      clearCookieCall: undefined as
    | {
        name: string;
        options: CookieOptions | undefined;
      }
    | undefined,
  };

  const response = {
    status(code: number) {
      state.statusCode = code;
      return response;
    },

    json(body: unknown) {
      state.body = body;
      return response;
    },

    cookie(name: string, value: string, options?: CookieOptions) {
      state.cookieCall = { name, value, options };
      return response;
    },

    clearCookie(name: string, options?: CookieOptions) {
      state.clearCookieCall = { name, options };
      return response;
    },
  };

  return {
    state,
    response: response as unknown as Response,
  };
}

function createController(
  overrides: Partial<AuthControllerDependencies> = {},
) {
  return createAuthController({
    verifyAdminCredentials: async () => true,
    createAdminToken: (username) => `test-token:${username}`,
    ...overrides,
  });
}

test('rejects a missing login body', async () => {
  const controller = createController();
  const { state, response } = createResponseMock();

  await controller.loginAdmin(
    { body: null } as unknown as Request,
    response,
    () => undefined,
  );

  assert.equal(state.statusCode, 400);
  assert.deepEqual(state.body, {
    message: 'Username and password are required',
  });

  assert.equal(state.cookieCall, undefined);
});

test('rejects invalid login field types', async () => {
  const controller = createController();
  const { state, response } = createResponseMock();

  await controller.loginAdmin(
    {
      body: {
        username: config.ADMIN_USERNAME,
        password: 12345,
      },
    } as unknown as Request,
    response,
    () => undefined,
  );

  assert.equal(state.statusCode, 400);
  assert.equal(state.cookieCall, undefined);
});

test('rejects invalid credentials', async () => {
  const controller = createController({
    verifyAdminCredentials: async () => false,
  });

  const { state, response } = createResponseMock();

  await controller.loginAdmin(
    {
      body: {
        username: config.ADMIN_USERNAME,
        password: 'incorrect-password',
      },
    } as unknown as Request,
    response,
    () => undefined,
  );

  assert.equal(state.statusCode, 401);
  assert.deepEqual(state.body, {
    message: 'Invalid credentials',
  });

  assert.equal(state.cookieCall, undefined);
});

test('successfully logs in and sets secure cookie options', async () => {
  let receivedCredentials:
    | { username: string; password: string }
    | undefined;

  const controller = createController({
    verifyAdminCredentials: async (username, password) => {
      receivedCredentials = { username, password };
      return true;
    },
  });

  const { state, response } = createResponseMock();

  await controller.loginAdmin(
    {
      body: {
        username: config.ADMIN_USERNAME,
        password: 'correct-test-password',
      },
    } as unknown as Request,
    response,
    () => undefined,
  );

  assert.equal(state.statusCode, 200);

  assert.deepEqual(receivedCredentials, {
    username: config.ADMIN_USERNAME,
    password: 'correct-test-password',
  });

  assert.deepEqual(state.body, {
    user: {
      username: config.ADMIN_USERNAME,
      role: 'admin',
    },
  });

  assert.equal(state.cookieCall?.name, ADMIN_COOKIE_NAME);
  assert.equal(
    state.cookieCall?.value,
    `test-token:${config.ADMIN_USERNAME}`,
  );

  assert.deepEqual(state.cookieCall?.options, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: config.JWT_EXPIRE_SECONDS * 1000,
  });
});

test('does not expose internal login errors', async () => {
  const controller = createController({
    verifyAdminCredentials: async () => {
      throw new Error('Sensitive internal error');
    },
  });

  const { state, response } = createResponseMock();

  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    await controller.loginAdmin(
      {
        body: {
          username: config.ADMIN_USERNAME,
          password: 'test-password',
        },
      } as unknown as Request,
      response,
      () => undefined,
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(state.statusCode, 500);
  assert.deepEqual(state.body, {
    message: 'Server error',
  });
});

test('successfully logs out and clears the admin cookie', async () => {
  const controller = createController();
  const { state, response } = createResponseMock();

  await controller.logoutAdmin(
    {} as Request,
    response,
    () => undefined,
  );

  assert.equal(state.statusCode, 200);

  assert.deepEqual(state.body, {
    message: 'Logged out',
  });

  assert.equal(state.clearCookieCall?.name, ADMIN_COOKIE_NAME);

  assert.deepEqual(state.clearCookieCall?.options, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
});
