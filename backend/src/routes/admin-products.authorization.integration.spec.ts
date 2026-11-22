import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';

import cookieParser from 'cookie-parser';
import express from 'express';

import { ADMIN_COOKIE_NAME } from '../services/auth.service.js';
import adminProductsRouter from './admin-products.js';

test('rejects unauthenticated requests to every admin product endpoint', async () => {
  const app = express();

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/admin/products', adminProductsRouter);

  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const requests = [
      { method: 'GET', path: '/api/admin/products' },
      { method: 'GET', path: '/api/admin/products/invalid-id' },
      { method: 'POST', path: '/api/admin/products' },
      { method: 'PATCH', path: '/api/admin/products/invalid-id' },
      { method: 'DELETE', path: '/api/admin/products/invalid-id' },
    ] as const;

    for (const request of requests) {
      const response = await fetch(`${baseUrl}${request.path}`, {
        method: request.method,
      });

      assert.equal(
        response.status,
        401,
        `${request.method} ${request.path} must reject unauthenticated requests`,
      );

      const body = (await response.json()) as { message: string };

      assert.equal(body.message, 'Authentication required');
    }

    const invalidTokenResponse = await fetch(`${baseUrl}/api/admin/products`, {
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=not-a-valid-jwt`,
      },
    });

    assert.equal(invalidTokenResponse.status, 401);

    const invalidTokenBody = (await invalidTokenResponse.json()) as { message: string };

    assert.equal(invalidTokenBody.message, 'Invalid or expired authentication');
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
