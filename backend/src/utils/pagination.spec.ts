import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseBoundedQueryInteger } from './pagination.js';

test('uses fallback only when a pagination parameter is absent', () => {
  assert.equal(parseBoundedQueryInteger(undefined, 1, 10), 1);
  assert.equal(parseBoundedQueryInteger('3', 1, 10), 3);
});

test('rejects malformed, non-positive, non-canonical, and over-limit values', () => {
  const invalidValues = [
    '',
    '0',
    '-1',
    '1.5',
    '2x',
    '01',
    '11',
    ' 2',
    '2 ',
    '2\n',
    '2\r\n',
    '+2',
    '2e0',
    '9007199254740992',
    ['2'],
  ];

  for (const value of invalidValues) {
    assert.equal(parseBoundedQueryInteger(value, 1, 10), null, String(value));
  }
});
