
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import type { Request, Response } from 'express';

import {
  createUploadConcurrencyLimiter,
} from './uploadConcurrency.js';

import {
  releaseUploadLease,
} from '../utils/uploadLease.js';

class MockResponse extends EventEmitter {
  statusCode = 200;
  body: unknown;
  headers: Record<string, string> = {};

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  json(body: unknown) {
    this.body = body;
    return this;
  }
}

function createRequest(): Request {
  return {} as Request;
}

function invokeLimiter(
  limiter: ReturnType<typeof createUploadConcurrencyLimiter>,
  request: Request,
  response: MockResponse,
): boolean {
  let nextCalled = false;

  limiter(
    request,
    response as unknown as Response,
    () => {
      nextCalled = true;
    },
  );

  return nextCalled;
}

test('rejects invalid concurrency limits', () => {
  for (const invalidLimit of [0, -1, 1.5, Number.NaN]) {
    assert.throws(
      () => createUploadConcurrencyLimiter(invalidLimit),
      RangeError,
    );
  }
});

test('accepts one upload and rejects another when capacity is full', () => {
  const limiter = createUploadConcurrencyLimiter(1);

  const firstRequest = createRequest();
  const firstResponse = new MockResponse();

  const secondRequest = createRequest();
  const secondResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, firstRequest, firstResponse),
    true,
  );

  assert.equal(
    invokeLimiter(limiter, secondRequest, secondResponse),
    false,
  );

  assert.equal(secondResponse.statusCode, 503);

  assert.equal(
    secondResponse.headers['retry-after'],
    '1',
  );

  assert.deepEqual(secondResponse.body, {
    message:
      'Upload capacity is temporarily unavailable. Please retry shortly.',
  });

  releaseUploadLease(firstRequest);
});

test('does not release capacity on premature response close', () => {
  const limiter = createUploadConcurrencyLimiter(1);

  const firstRequest = createRequest();
  const firstResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, firstRequest, firstResponse),
    true,
  );

  // Simulate a client disconnect while application work is still running.
  firstResponse.emit('close');

  const secondRequest = createRequest();
  const secondResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, secondRequest, secondResponse),
    false,
  );

  assert.equal(secondResponse.statusCode, 503);

  // The application explicitly releases the slot when processing ends.
  releaseUploadLease(firstRequest);

  const thirdRequest = createRequest();
  const thirdResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, thirdRequest, thirdResponse),
    true,
  );

  thirdResponse.emit('finish');
});

test('releases capacity after application processing settles', async () => {
  const limiter = createUploadConcurrencyLimiter(1);

  const firstRequest = createRequest();
  const firstResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, firstRequest, firstResponse),
    true,
  );

  let completeProcessing!: () => void;

  const processing = new Promise<void>((resolve) => {
    completeProcessing = resolve;
  });

  // Client disconnects, but server-side processing remains active.
  firstResponse.emit('close');

  const secondRequest = createRequest();
  const secondResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, secondRequest, secondResponse),
    false,
  );

  // Simulate the controller's finally block.
  completeProcessing();
  await processing;

  releaseUploadLease(firstRequest);

  const thirdRequest = createRequest();
  const thirdResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, thirdRequest, thirdResponse),
    true,
  );

  thirdResponse.emit('finish');
});

test('releases capacity when a normal response finishes', () => {
  const limiter = createUploadConcurrencyLimiter(1);

  const firstRequest = createRequest();
  const firstResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, firstRequest, firstResponse),
    true,
  );

  firstResponse.emit('finish');

  const secondRequest = createRequest();
  const secondResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, secondRequest, secondResponse),
    true,
  );

  secondResponse.emit('finish');
});

test('does not release another request slot when release is called twice', () => {
  const limiter = createUploadConcurrencyLimiter(1);

  const firstRequest = createRequest();
  const firstResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, firstRequest, firstResponse),
    true,
  );

  releaseUploadLease(firstRequest);

  // The slot is now owned by the second request.
  const secondRequest = createRequest();
  const secondResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, secondRequest, secondResponse),
    true,
  );

  // A delayed finish event from the first response must do nothing.
  firstResponse.emit('finish');

  const thirdRequest = createRequest();
  const thirdResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, thirdRequest, thirdResponse),
    false,
  );

  assert.equal(thirdResponse.statusCode, 503);

  secondResponse.emit('finish');

  const fourthRequest = createRequest();
  const fourthResponse = new MockResponse();

  assert.equal(
    invokeLimiter(limiter, fourthRequest, fourthResponse),
    true,
  );

  fourthResponse.emit('finish');
});
