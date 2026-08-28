import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeArticle, serializeProduct } from '../utils/serializers.js';

const baseProduct = {
  id: 7,
  name: '테스트 상품',
  description: '충분히 긴 테스트 상품 설명입니다.',
  price: 1000,
  tags: ['테스트'],
  image: '/legacy.png',
  ownerId: 2,
  owner: { id: 2, nickname: '판매자', image: null },
  createdAt: new Date('2026-08-28T00:00:00Z'),
  updatedAt: new Date('2026-08-28T00:00:00Z'),
  _count: { likes: 3, comments: 0 },
};

test('product serializer preserves a legacy image and exposes like aliases', () => {
  const result = serializeProduct({ ...baseProduct, images: [], likes: [{ userId: 1 }] });
  assert.deepEqual(result.images, ['/legacy.png']);
  assert.equal(result.image, '/legacy.png');
  assert.equal(result.likeCount, 3);
  assert.equal(result.favoriteCount, 3);
  assert.equal(result.isLiked, true);
  assert.equal(result.isFavorite, true);
});

test('anonymous product serialization has a deterministic false isLiked', () => {
  const result = serializeProduct({ ...baseProduct, images: [{ url: '/new.png' }] });
  assert.equal(result.isLiked, false);
  assert.equal(result.image, '/new.png');
});

test('article serializer keeps ordered images and first-image compatibility', () => {
  const article = serializeArticle({
    id: 3,
    title: '게시글',
    content: '내용',
    image: '/legacy-article.png',
    images: [{ url: '/one.png' }, { url: '/two.png' }],
    ownerId: 2,
    owner: { id: 2, nickname: '작성자', image: null },
    likesCount: 9,
    _count: { likes: 0, comments: 0 },
    createdAt: new Date('2026-08-28T00:00:00Z'),
    updatedAt: new Date('2026-08-28T00:00:00Z'),
  });
  assert.deepEqual(article.images, ['/one.png', '/two.png']);
  assert.equal(article.image, '/one.png');
  assert.equal(article.likeCount, 9);
  assert.equal(article.isLiked, false);
});
