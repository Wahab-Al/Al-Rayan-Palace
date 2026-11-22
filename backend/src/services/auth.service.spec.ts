
import assert from 'node:assert/strict';
import test from 'node:test';

import jwt, {
  type JwtPayload,
  type Secret,
  type SignOptions,
} from 'jsonwebtoken';

import config from '../config/env.js';

import {
  createAdminToken,
  verifyAdminToken,
  verifyAdminCredentials,
} from './auth.service.js';

function signTestToken(
  payload: JwtPayload = { role: 'admin' },
  overrides: SignOptions = {},
  secret: Secret = config.JWT_SECRET,
  includeExpiration = true,
): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    subject: config.ADMIN_USERNAME,
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,

    ...(includeExpiration
      ? { expiresIn: config.JWT_EXPIRE_SECONDS }
      : {}),

    ...overrides,
  };

  return jwt.sign(payload, secret, options);
}

test('accepts a valid admin token', () => {
  const token = createAdminToken(config.ADMIN_USERNAME);

  const result = verifyAdminToken(token);

  assert.deepEqual(result, {
    sub: config.ADMIN_USERNAME,
    role: 'admin',
  });
});

test('rejects a token signed with a different secret', () => {
  const token = signTestToken(
    { role: 'admin' },
    {},
    'different-test-secret',
  );

  assert.throws(() => verifyAdminToken(token));
});

test('rejects HS384 instead of HS256', () => {
  const token = signTestToken(
    { role: 'admin' },
    { algorithm: 'HS384' },
  );

  assert.throws(() => verifyAdminToken(token));
});

test('rejects an incorrect issuer', () => {
  const token = signTestToken(
    { role: 'admin' },
    { issuer: 'unexpected-issuer' },
  );

  assert.throws(() => verifyAdminToken(token));
});

test('rejects an incorrect audience', () => {
  const token = signTestToken(
    { role: 'admin' },
    { audience: 'unexpected-audience' },
  );

  assert.throws(() => verifyAdminToken(token));
});

test('rejects an expired token', () => {
  const token = signTestToken(
    { role: 'admin' },
    { expiresIn: -1 },
  );

  assert.throws(() => verifyAdminToken(token));
});

test('rejects a token without expiration', () => {
  const token = signTestToken(
    { role: 'admin' },
    {},
    config.JWT_SECRET,
    false,
  );

  assert.throws(() => verifyAdminToken(token));
});

test('rejects a token belonging to another subject', () => {
  const token = signTestToken(
    { role: 'admin' },
    { subject: 'another-admin' },
  );

  assert.throws(() => verifyAdminToken(token));
});

test('rejects a token without the admin role', () => {
  const token = signTestToken({
    role: 'user',
  });

  assert.throws(() => verifyAdminToken(token));
});

test('rejects a token with a lifetime exceeding the configured limit', () => {
  const token = signTestToken(
    { role: 'admin' },
    {
      expiresIn: config.JWT_EXPIRE_SECONDS + 1,
    },
  );

  assert.throws(() => verifyAdminToken(token));
});

test('rejects creation of a token for an unexpected username', () => {
  assert.throws(() => createAdminToken('another-user'));
});

test('rejects an unexpected admin username', async () => {
  const result = await verifyAdminCredentials(
    'unexpected-admin',
    'invalid-test-password',
  );

  assert.equal(result, false);
});

test('rejects an incorrect admin password', async () => {
  const result = await verifyAdminCredentials(
    config.ADMIN_USERNAME,
    'invalid-test-password',
  );

  assert.equal(result, false);
});