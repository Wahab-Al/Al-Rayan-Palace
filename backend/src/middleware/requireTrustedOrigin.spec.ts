
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { NextFunction, Request, Response } from 'express';

import config from '../config/env.js';
import { requireTrustedOrigin } from './requireTrustedOrigin.js';

type Headers = Record<string, string | undefined>;

function executeMiddleware(
  method: string,
  headers: Headers = {},
) {
  let statusCode = 200;
  let responseBody: unknown;
  let nextCalled = false;

  const req = {
    method,
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  } as unknown as Request;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
  } as unknown as Response;

  const next = (() => {
    nextCalled = true;
  }) as NextFunction;

  requireTrustedOrigin(req, res, next);

  return {
    statusCode,
    responseBody,
    nextCalled,
  };
}

const trustedOrigin = new URL(config.FRONTEND_ORIGIN).origin;

test('allows POST requests from the trusted frontend origin', () => {
  const result = executeMiddleware('POST', {
    origin: trustedOrigin,
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
});

test('rejects POST requests from an untrusted origin', () => {
  const result = executeMiddleware('POST', {
    origin: 'https://attacker.example',
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
});

test('rejects opaque null origins', () => {
  const result = executeMiddleware('POST', {
    origin: 'null',
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
});

test('uses a trusted Referer when Origin is absent', () => {
  const result = executeMiddleware('PATCH', {
    referer: `${trustedOrigin}/admin/products`,
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
});

test('rejects requests with missing Origin and Referer', () => {
  const result = executeMiddleware('DELETE');

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
});

test('does not allow an attacker subdomain', () => {
  const result = executeMiddleware('POST', {
    origin: `${trustedOrigin}.attacker.example`,
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
});

test('allows safe GET requests without Origin', () => {
  const result = executeMiddleware('GET');

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
});
