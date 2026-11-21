
import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';

import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';

import config from '../config/env.js';

import { createAuthController } from '../controller/auth.controller.js';

import { requireAdmin } from '../middleware/requireAdmin.js';
import { requireTrustedOrigin } from '../middleware/requireTrustedOrigin.js';

import {
  ADMIN_COOKIE_NAME,
  createAdminToken,
} from '../services/auth.service.js';

import { createAuthRouter } from './auth.js';

test('integrates login, JWT authentication, trusted origin and logout over HTTP', async () => {
  let credentialChecks = 0;

  // Mock only password verification.
  // JWT creation and verification remain real.
  const controller = createAuthController({
    verifyAdminCredentials: async (username, password) => {
      credentialChecks++;

      return (
        username === config.ADMIN_USERNAME &&
        password === 'integration-test-password'
      );
    },
    createAdminToken,
  });

  const app = express();

  // Match the relevant production middleware order.
  app.use(cookieParser());

  app.use(
    express.json({
      limit: '1mb',
    }),
  );

  app.use('/api/auth', requireTrustedOrigin);

  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
    }),
  );

  app.use('/api/auth', createAuthRouter(controller));

  app.get('/api/auth/me', requireAdmin, (req, res) => {
    res.status(200).json({
      authenticated: true,
      admin: req.admin,
    });
  });

  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();

    assert.ok(address && typeof address !== 'string');

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const trustedOrigin = new URL(config.FRONTEND_ORIGIN).origin;

    // 1. An untrusted origin must be rejected before credential verification.
    const rejectedOriginLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://attacker.example',
      },
      body: JSON.stringify({
        username: config.ADMIN_USERNAME,
        password: 'integration-test-password',
      }),
    });

    assert.equal(rejectedOriginLogin.status, 403);
    assert.equal(credentialChecks, 0);

    // 2. Invalid credentials must not create an authentication cookie.
    const invalidLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: trustedOrigin,
      },
      body: JSON.stringify({
        username: config.ADMIN_USERNAME,
        password: 'incorrect-password',
      }),
    });

    assert.equal(invalidLogin.status, 401);
    assert.equal(invalidLogin.headers.get('set-cookie'), null);
    assert.equal(credentialChecks, 1);

    // 3. Valid credentials must create a real JWT cookie.
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: trustedOrigin,
      },
      body: JSON.stringify({
        username: config.ADMIN_USERNAME,
        password: 'integration-test-password',
      }),
    });

    assert.equal(loginResponse.status, 200);
    assert.equal(credentialChecks, 2);

    const loginBody = await loginResponse.json() as {
      user: {
        username: string;
        role: string;
      };
    };

    assert.deepEqual(loginBody, {
      user: {
        username: config.ADMIN_USERNAME,
        role: 'admin',
      },
    });

    const loginSetCookie = loginResponse.headers.get('set-cookie');

    assert.ok(loginSetCookie);
    assert.match(loginSetCookie, new RegExp(`^${ADMIN_COOKIE_NAME}=`));
    assert.match(loginSetCookie, /HttpOnly/i);
    assert.match(loginSetCookie, /Path=\//i);

    const expectedSameSite =
      config.NODE_ENV === 'production' ? 'None' : 'Lax';

    assert.match(
      loginSetCookie,
      new RegExp(`SameSite=${expectedSameSite}`, 'i'),
    );

    if (config.NODE_ENV === 'production') {
      assert.match(loginSetCookie, /Secure/i);
    }

    const cookiePair = loginSetCookie.split(';', 1)[0];

    assert.ok(cookiePair);

    // 4. The real requireAdmin middleware must validate the JWT.
    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        cookie: cookiePair,
      },
    });

    assert.equal(meResponse.status, 200);

    const meBody = await meResponse.json() as {
      authenticated: boolean;
      admin: {
        sub: string;
        role: string;
      };
    };

    assert.deepEqual(meBody, {
      authenticated: true,
      admin: {
        sub: config.ADMIN_USERNAME,
        role: 'admin',
      },
    });

    // 5. An untrusted origin must not be allowed to log out.
    const rejectedLogout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        origin: 'https://attacker.example',
        cookie: cookiePair,
      },
    });

    assert.equal(rejectedLogout.status, 403);
    assert.equal(rejectedLogout.headers.get('set-cookie'), null);

    // 6. A trusted logout must clear the browser cookie.
    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        origin: trustedOrigin,
        cookie: cookiePair,
      },
    });

    assert.equal(logoutResponse.status, 200);

    assert.deepEqual(await logoutResponse.json(), {
      message: 'Logged out',
    });

    const logoutSetCookie = logoutResponse.headers.get('set-cookie');

    assert.ok(logoutSetCookie);
    assert.match(logoutSetCookie, new RegExp(`^${ADMIN_COOKIE_NAME}=`));
    assert.match(logoutSetCookie, /Expires=/i);

    // 7. Without the cookie, authentication must fail.
    const unauthenticatedResponse = await fetch(
      `${baseUrl}/api/auth/me`,
    );

    assert.equal(unauthenticatedResponse.status, 401);

    // 8. Document stateless JWT behavior:
    // clearing the browser cookie does not revoke a copied JWT.
    const copiedTokenResponse = await fetch(
      `${baseUrl}/api/auth/me`,
      {
        headers: {
          cookie: cookiePair,
        },
      },
    );

    assert.equal(copiedTokenResponse.status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});
