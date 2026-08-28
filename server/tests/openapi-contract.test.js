import test from 'node:test';
import assert from 'node:assert/strict';
import { invalidateViewerScopedQueries, queryKeys } from '../../lib/query-keys.js';
import { openapiSpecification } from '../docs/openapi.js';

test('optional-auth GET operations advertise anonymous and authenticated access', () => {
  const operations = [
    ['/products', 'get'],
    ['/products/best', 'get'],
    ['/products/{productId}', 'get'],
    ['/products/{productId}/comments', 'get'],
    ['/articles', 'get'],
    ['/articles/{articleId}', 'get'],
    ['/articles/{articleId}/comments', 'get'],
  ];
  const expected = [{}, { bearerAuth: [] }, { accessCookie: [] }];

  for (const [path, method] of operations) {
    assert.deepEqual(openapiSpecification.paths[path][method].security, expected, `${method.toUpperCase()} ${path}`);
  }
});

test('JSON and multipart request objects reject undocumented properties', () => {
  const strictSchemas = [
    'SignupInput',
    'SigninInput',
    'RefreshInput',
    'CommentInput',
    'ProductInput',
    'ProductUpdate',
    'ArticleInput',
    'ArticleUpdate',
  ];

  for (const name of strictSchemas) {
    assert.equal(openapiSpecification.components.schemas[name].additionalProperties, false, name);
  }

  const uploadSchema = openapiSpecification.paths['/uploads/images'].post
    .requestBody.content['multipart/form-data'].schema;
  assert.equal(uploadSchema.additionalProperties, false);
});

test('viewer identity changes invalidate all isLiked-bearing resource caches', () => {
  const calls = [];
  const queryClient = {
    invalidateQueries(options) {
      calls.push(options);
    },
  };

  invalidateViewerScopedQueries(queryClient);

  assert.deepEqual(calls, [
    { queryKey: queryKeys.products.all },
    { queryKey: queryKeys.articles.all },
  ]);
});
