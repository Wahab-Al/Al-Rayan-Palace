import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildAdminProductFilter,
  createProduct,
  parseInstagramUrl,
  validateMediaSelection,
} from './product.controller.js';

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
