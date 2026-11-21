import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import { isValidUploadedMedia, validateUploadedMedia } from './validateUploadedMedia.js';

const pngFixture = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==',
  'base64',
);

const jpegSignature = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0,
  0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01,
]);

async function runMiddleware(files?: Array<{
  buffer: Buffer;
  mimetype: string;
}>) {
  let statusCode = 200;
  let responseBody: unknown;
  let nextCalled = false;

  const req = { files } as unknown as Request;

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

  await validateUploadedMedia(req, res, next);

  return { statusCode, responseBody, nextCalled };
}

test('accepts PNG content with matching MIME type', async () => {
  assert.equal(
    await isValidUploadedMedia({
      buffer: pngFixture,
      mimetype: 'image/png',
    }),
    true,
  );
});

test('accepts JPEG content with matching MIME type', async () => {
  assert.equal(
    await isValidUploadedMedia({
      buffer: jpegSignature,
      mimetype: 'image/jpeg',
    }),
    true,
  );
});

test('rejects PNG content declared as JPEG', async () => {
  assert.equal(
    await isValidUploadedMedia({
      buffer: pngFixture,
      mimetype: 'image/jpeg',
    }),
    false,
  );
});

test('rejects unrecognized file content', async () => {
  assert.equal(
    await isValidUploadedMedia({
      buffer: Buffer.from('not a real image or video'),
      mimetype: 'image/png',
    }),
    false,
  );
});

test('rejects empty files', async () => {
  assert.equal(
    await isValidUploadedMedia({
      buffer: Buffer.alloc(0),
      mimetype: 'image/png',
    }),
    false,
  );
});

test('rejects unsupported MIME types', async () => {
  assert.equal(
    await isValidUploadedMedia({
      buffer: pngFixture,
      mimetype: 'image/svg+xml',
    }),
    false,
  );
});

test('allows valid media to reach the controller', async () => {
  const result = await runMiddleware([
    {
      buffer: pngFixture,
      mimetype: 'image/png',
    },
  ]);

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
});

test('rejects spoofed media before reaching the controller', async () => {
  const result = await runMiddleware([
    {
      buffer: pngFixture,
      mimetype: 'image/jpeg',
    },
  ]);

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.responseBody, {
    message: 'Unsupported or invalid media content',
  });
});

test('allows PATCH requests without new media', async () => {
  const result = await runMiddleware([]);

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
});