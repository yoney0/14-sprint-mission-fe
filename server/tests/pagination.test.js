import test from 'node:test';
import assert from 'node:assert/strict';
import { clampBestLimit, getPagination } from '../utils/pagination.js';

test('getPagination converts a one-based page to Prisma skip/take', () => {
  assert.deepEqual(getPagination({ page: 3, pageSize: 15 }), {
    page: 3,
    pageSize: 15,
    skip: 30,
    take: 15,
  });
});

test('best product limit is always between one and four', () => {
  assert.equal(clampBestLimit(10), 4);
  assert.equal(clampBestLimit(0), 4);
  assert.equal(clampBestLimit(2), 2);
});
