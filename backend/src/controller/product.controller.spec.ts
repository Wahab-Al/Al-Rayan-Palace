import assert from 'node:assert/strict';
import { test } from 'node:test';
import Product from '../models/product.js';
import {
  buildAdminProductFilter,
  createDeleteProductHandler,
  createProduct,
  parseInstagramUrl,
  updateProduct,
  validateMediaSelection,
} from './product.controller.js';

const validProductId = '507f1f77bcf86cd799439011';

function createProductDeleteResponseMock() {
  const state = {
    statusCode: 200,
    body: undefined as unknown,
    sent: false,
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

    send() {
      state.sent = true;
      return response;
    },
  };

  return {
    state,
    response: response as never,
  };
}

test('allows one to three images or a single video for product media', () => {
  assert.equal(validateMediaSelection([{ mimetype: 'image/jpeg' }]), null);
  assert.equal(
    validateMediaSelection([
      { mimetype: 'image/jpeg' },
      { mimetype: 'image/png' },
      { mimetype: 'image/webp' },
    ]),
    null,
  );
  assert.equal(validateMediaSelection([{ mimetype: 'video/mp4' }]), null);
  assert.match(
    validateMediaSelection([{ mimetype: 'video/mp4' }, { mimetype: 'video/webm' }]) ?? '',
    /one video/,
  );
  assert.match(
    validateMediaSelection([{ mimetype: 'image/jpeg' }, { mimetype: 'video/mp4' }]) ?? '',
    /one video/,
  );
});

test('builds product filters for search, category, media type, and featured status', () => {
  const filter = buildAdminProductFilter({
    search: 'Featured',
    category: 'Dining Rooms',
    mediaType: 'video',
    featured: 'true',
  });

  assert.equal(filter.category, 'Dining Rooms');
  assert.equal(filter.mediaType, 'video');
  assert.equal(filter.featured, true);

  const conditions = filter.$or as Array<Record<string, unknown>>;
  assert.ok(conditions.some((condition) => condition.featured === true));
  assert.ok(
    conditions.some(
      (condition) =>
        condition.title instanceof RegExp && condition.title.test('Featured dining set'),
    ),
  );
});

test('matches a case-insensitive substring in the middle of a product name', () => {
  const filter = buildAdminProductFilter({
    search: 'ayan',
    category: 'all',
    mediaType: 'all',
    featured: 'all',
  });
  const conditions = filter.$or as Array<Record<string, unknown>>;
  const titleSearch = conditions.find((condition) => condition.title instanceof RegExp)?.title;

  assert.ok(titleSearch instanceof RegExp);
  assert.equal(titleSearch.test('Al Rayan Palace'), true);
});

test('escapes search text so it cannot change the regular expression', () => {
  const filter = buildAdminProductFilter({
    search: '[.*]',
    category: 'all',
    mediaType: 'all',
    featured: 'all',
  });
  const conditions = filter.$or as Array<Record<string, unknown>>;
  const titleSearch = conditions.find((condition) => condition.title instanceof RegExp)?.title;

  assert.ok(titleSearch instanceof RegExp);
  assert.equal(titleSearch.test('A literal [.*] in the name'), true);
  assert.equal(titleSearch.test('Any unrelated name'), false);
});

test('accepts HTTPS Instagram links and rejects other hosts or protocols', () => {
  assert.equal(
    parseInstagramUrl('https://www.instagram.com/p/example/'),
    'https://www.instagram.com/p/example/',
  );
  assert.throws(
    () => parseInstagramUrl('http://www.instagram.com/p/example/'),
    /Instagram reference/,
  );
  assert.throws(() => parseInstagramUrl('https://example.com/p/example/'), /Instagram reference/);
  assert.throws(
    () => parseInstagramUrl('https://user@www.instagram.com/p/example/'),
    /Instagram reference/,
  );
  assert.throws(
    () => parseInstagramUrl('https://www.instagram.com/' + 'p'.repeat(2049)),
    /Instagram reference/,
  );
  assert.equal(parseInstagramUrl('   '), undefined);
});

test('create handler rejects a non-Instagram reference with a client error', async () => {
  let statusCode = 200;
  let responseBody: unknown;

  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
  };

  await createProduct(
    {
      body: {
        title: 'Dining table',
        category: 'Dining Rooms',
        instagramUrl: 'https://example.com/reference',
      },
    } as never,
    response as never,
    (() => undefined) as never,
  );

  assert.equal(statusCode, 400);
  assert.match((responseBody as { message: string }).message, /Instagram reference/);
});

test('update handler does not expose internal errors', async (t) => {
  t.mock.method(
    Product,
    'findById',
    (() => {
      throw new Error('Sensitive internal database details');
    }) as typeof Product.findById,
  );

  let statusCode = 200;
  let responseBody: unknown;

  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },

    json(body: unknown) {
      responseBody = body;
      return this;
    },
  };

  const originalConsoleError = console.error;

  t.mock.method(console, 'error', () => undefined);

  await updateProduct(
    {
      params: {
        id: '507f1f77bcf86cd799439011',
      },
      body: {},
    } as never,
    response as never,
    (() => undefined) as never,
  );

  assert.equal(statusCode, 500);

  assert.deepEqual(responseBody, {
    message: 'Server error',
  });

  assert.equal(
    JSON.stringify(responseBody).includes(
      'Sensitive internal database details',
    ),
    false,
  );

  // Suppress unused variable warning avoidance is unnecessary;
  // the test framework restores console.error after the test.
  void originalConsoleError;
});


test('rejects an invalid product ID without querying MongoDB', async () => {
  let databaseCalled = false;

  const handler = createDeleteProductHandler({
    findByIdAndDelete: async () => {
      databaseCalled = true;
      return null;
    },
    deleteMedia: async () => undefined,
  });

  const { state, response } = createProductDeleteResponseMock();

  await handler(
    { params: { id: 'invalid-id' } } as never,
    response,
    (() => undefined) as never,
  );

  assert.equal(state.statusCode, 400);
  assert.equal(databaseCalled, false);
});

test('returns 404 when the product does not exist', async () => {
  const handler = createDeleteProductHandler({
    findByIdAndDelete: async () => null,
    deleteMedia: async () => undefined,
  });

  const { state, response } = createProductDeleteResponseMock();

  await handler(
    { params: { id: validProductId } } as never,
    response,
    (() => undefined) as never,
  );

  assert.equal(state.statusCode, 404);
  assert.deepEqual(state.body, {
    message: 'Product not found',
  });
});

test('uses the atomically deleted document to clean up gallery media', async () => {
  let databaseCalls = 0;
  const deletedMedia: string[] = [];

  const handler = createDeleteProductHandler({
    findByIdAndDelete: async (id) => {
      databaseCalls++;

      assert.equal(id, validProductId);

      return {
        mediaType: 'image',
        mediaPublicId: 'image-1',
        gallery: [
          { url: 'https://example.test/1.jpg', publicId: 'image-1' },
          { url: 'https://example.test/2.jpg', publicId: 'image-2' },
          { url: 'https://example.test/2-copy.jpg', publicId: 'image-2' },
        ],
      };
    },

    deleteMedia: async (publicId, resourceType) => {
      deletedMedia.push(`${resourceType}:${publicId}`);
    },
  });

  const { state, response } = createProductDeleteResponseMock();

  await handler(
    { params: { id: validProductId } } as never,
    response,
    (() => undefined) as never,
  );

  assert.equal(databaseCalls, 1);
  assert.deepEqual(deletedMedia, [
    'image:image-1',
    'image:image-2',
  ]);

  assert.equal(state.statusCode, 204);
  assert.equal(state.sent, true);
});

test('deletes the primary video when the product has no gallery', async () => {
  const deletedMedia: Array<{
    publicId: string;
    resourceType: string;
  }> = [];

  const handler = createDeleteProductHandler({
    findByIdAndDelete: async () => ({
      mediaType: 'video',
      mediaPublicId: 'video-123',
    }),

    deleteMedia: async (publicId, resourceType) => {
      deletedMedia.push({ publicId, resourceType });
    },
  });

  const { state, response } = createProductDeleteResponseMock();

  await handler(
    { params: { id: validProductId } } as never,
    response,
    (() => undefined) as never,
  );

  assert.deepEqual(deletedMedia, [
    {
      publicId: 'video-123',
      resourceType: 'video',
    },
  ]);

  assert.equal(state.statusCode, 204);
});

test('continues deletion when Cloudinary cleanup fails', async (t) => {
  t.mock.method(console, 'error', () => undefined);

  const deletionAttempts: string[] = [];

  const handler = createDeleteProductHandler({
    findByIdAndDelete: async () => ({
      mediaType: 'image',
      gallery: [
        { url: 'https://example.test/1.jpg', publicId: 'image-1' },
        { url: 'https://example.test/2.jpg', publicId: 'image-2' },
      ],
    }),

    deleteMedia: async (publicId) => {
      deletionAttempts.push(publicId);

      if (publicId === 'image-1') {
        throw new Error('Cloudinary cleanup failed');
      }
    },
  });

  const { state, response } = createProductDeleteResponseMock();

  await handler(
    { params: { id: validProductId } } as never,
    response,
    (() => undefined) as never,
  );

  assert.deepEqual(deletionAttempts, ['image-1', 'image-2']);
  assert.equal(state.statusCode, 204);
  assert.equal(state.sent, true);
});

test('does not expose MongoDB errors when product deletion fails', async (t) => {
  t.mock.method(console, 'error', () => undefined);

  let cleanupCalled = false;

  const handler = createDeleteProductHandler({
    findByIdAndDelete: async () => {
      throw new Error('Sensitive MongoDB internal error');
    },

    deleteMedia: async () => {
      cleanupCalled = true;
    },
  });

  const { state, response } = createProductDeleteResponseMock();

  await handler(
    { params: { id: validProductId } } as never,
    response,
    (() => undefined) as never,
  );

  assert.equal(state.statusCode, 500);
  assert.deepEqual(state.body, {
    message: 'Server error',
  });

  assert.equal(cleanupCalled, false);
});
