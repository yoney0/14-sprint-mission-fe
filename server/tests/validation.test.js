import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createArticleBody,
  createProductBody,
  listQuery,
  oauthCallbackQuery,
  signupBody,
} from '../validators/schemas.js';

test('product and article payloads accept at most three images', () => {
  const product = { name: '상품', description: '열 글자 이상의 상품 설명입니다.', price: 1000 };
  const article = { title: '제목', content: '내용' };
  const image = (index) => `/uploads/7-550e8400-e29b-41d4-a716-44665544000${index}.png`;
  const three = [image(0), image(1), image(2)];
  const four = [...three, image(3)];

  assert.equal(createProductBody.safeParse({ ...product, images: three }).success, true);
  assert.equal(createProductBody.safeParse({ ...product, images: four }).success, false);
  assert.equal(createArticleBody.safeParse({ ...article, images: three }).success, true);
  assert.equal(createArticleBody.safeParse({ ...article, images: four }).success, false);
});

test('create payloads reject remote and protocol-relative image references', () => {
  const product = { name: '상품', description: '열 글자 이상의 상품 설명입니다.', price: 1000 };
  assert.equal(createProductBody.safeParse({ ...product, images: ['https://evil.example/a.png'] }).success, false);
  assert.equal(createProductBody.safeParse({ ...product, images: ['//evil.example/a.png'] }).success, false);
});

test('list query coerces pagination and only accepts the API sort contract', () => {
  const parsed = listQuery.parse({ page: '2', pageSize: '4', orderBy: 'like' });
  assert.deepEqual(parsed, { page: 2, pageSize: 4, keyword: '', orderBy: 'like' });
  assert.equal(listQuery.safeParse({ orderBy: 'favorite' }).success, false);
  assert.equal(listQuery.safeParse({ page: '1e308' }).success, false);
  assert.equal(listQuery.safeParse({ page: null }).success, false);
});

test('product price does not coerce empty or boolean values to zero', () => {
  const product = { name: '상품', description: '열 글자 이상의 상품 설명입니다.' };
  assert.equal(createProductBody.safeParse({ ...product, price: '' }).success, false);
  assert.equal(createProductBody.safeParse({ ...product, price: null }).success, false);
  assert.equal(createProductBody.safeParse({ ...product, price: false }).success, false);
  assert.equal(createProductBody.safeParse({ ...product, price: '0' }).success, true);
});

test('signup validation rejects a mismatched password confirmation', () => {
  const result = signupBody.safeParse({
    email: 'user@example.com', nickname: '판다', password: 'Password1!', passwordConfirmation: 'Password2!',
  });
  assert.equal(result.success, false);
});

test('signup enforces the bcrypt 72-byte password boundary', () => {
  const common = { email: 'user@example.com', nickname: '판다' };
  assert.equal(signupBody.safeParse({ ...common, password: '가'.repeat(24) }).success, true);
  assert.equal(signupBody.safeParse({ ...common, password: `${'가'.repeat(24)}A` }).success, false);
});

test('OAuth callback accepts either a success code or a provider error', () => {
  assert.equal(oauthCallbackQuery.safeParse({ code: 'code', state: 'state' }).success, true);
  assert.equal(oauthCallbackQuery.safeParse({ error: 'access_denied', state: 'state' }).success, true);
  assert.equal(oauthCallbackQuery.safeParse({ code: 'code', error: 'access_denied', state: 'state' }).success, false);
  assert.equal(oauthCallbackQuery.safeParse({ state: 'state' }).success, false);
});
