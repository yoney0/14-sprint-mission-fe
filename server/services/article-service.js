import prisma from '../config/prisma.js';
import AppError from '../errors/AppError.js';
import { getPagination } from '../utils/pagination.js';
import { serializeArticle } from '../utils/serializers.js';
import { articleSelect } from './selectors.js';
import {
  assertOwnedImageReferences,
  removeUnreferencedUploads,
} from './upload-service.js';

function articleOrder(orderBy) {
  return orderBy === 'like'
    ? [{ likesCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
    : [{ createdAt: 'desc' }, { id: 'desc' }];
}

function readImageUrls(input, { create = false } = {}) {
  if (Object.prototype.hasOwnProperty.call(input, 'images')) return input.images || [];
  return create ? [] : undefined;
}

async function ensureOwnedArticle(client, articleId, userId) {
  const article = await client.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      ownerId: true,
      image: true,
      images: { select: { url: true } },
    },
  });
  if (!article) throw new AppError(404, '게시글을 찾을 수 없습니다.', { code: 'ARTICLE_NOT_FOUND' });
  if (article.ownerId !== userId) {
    throw new AppError(403, '게시글을 등록한 사용자만 변경할 수 있습니다.', { code: 'FORBIDDEN' });
  }
  return article;
}

export async function listArticles({ page, pageSize, keyword, orderBy }, userId) {
  const { skip, take } = getPagination({ page, pageSize });
  const where = keyword ? {
    OR: [
      { title: { contains: keyword, mode: 'insensitive' } },
      { content: { contains: keyword, mode: 'insensitive' } },
    ],
  } : {};

  const [totalCount, articles] = await prisma.$transaction([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      skip,
      take,
      orderBy: articleOrder(orderBy),
      select: articleSelect(userId),
    }),
  ]);

  return {
    list: articles.map(serializeArticle),
    totalCount,
    page,
    pageSize,
    orderBy,
  };
}

export async function getArticle(articleId, userId) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: articleSelect(userId, { includeComments: true }),
  });
  if (!article) throw new AppError(404, '게시글을 찾을 수 없습니다.', { code: 'ARTICLE_NOT_FOUND' });
  return serializeArticle(article);
}

export async function createArticle(input, userId) {
  const imageUrls = readImageUrls(input, { create: true });
  await assertOwnedImageReferences(imageUrls, userId);
  const article = await prisma.article.create({
    data: {
      title: input.title,
      content: input.content,
      image: imageUrls[0] || null,
      ownerId: userId,
      ...(imageUrls.length ? {
        images: {
          create: imageUrls.map((url, position) => ({ url, position })),
        },
      } : {}),
    },
    select: articleSelect(userId),
  });
  return serializeArticle(article);
}

export async function updateArticle(articleId, input, userId) {
  const imageUrls = readImageUrls(input);
  const result = await prisma.$transaction(async (tx) => {
    const existing = await ensureOwnedArticle(tx, articleId, userId);
    const existingUrls = [existing.image, ...existing.images.map(({ url }) => url)].filter(Boolean);
    if (imageUrls !== undefined) {
      await assertOwnedImageReferences(imageUrls, userId, existingUrls);
    }
    const data = {};
    for (const field of ['title', 'content']) {
      if (Object.prototype.hasOwnProperty.call(input, field)) data[field] = input[field];
    }
    if (imageUrls !== undefined) {
      data.image = imageUrls[0] || null;
      data.images = {
        deleteMany: {},
        ...(imageUrls.length ? {
          create: imageUrls.map((url, position) => ({ url, position })),
        } : {}),
      };
    }
    const article = await tx.article.update({
      where: { id: articleId },
      data,
      select: articleSelect(userId),
    });
    return {
      article,
      removedImageUrls: imageUrls === undefined
        ? []
        : existingUrls.filter((url) => !imageUrls.includes(url)),
    };
  });
  await removeUnreferencedUploads(result.removedImageUrls);
  return serializeArticle(result.article);
}

export async function deleteArticle(articleId, userId) {
  const removedImageUrls = await prisma.$transaction(async (tx) => {
    const existing = await ensureOwnedArticle(tx, articleId, userId);
    await tx.article.delete({ where: { id: articleId } });
    return [existing.image, ...existing.images.map(({ url }) => url)].filter(Boolean);
  });
  await removeUnreferencedUploads(removedImageUrls);
}

export async function likeArticle(articleId, userId) {
  await prisma.$transaction(async (tx) => {
    const article = await tx.article.findUnique({ where: { id: articleId }, select: { id: true } });
    if (!article) throw new AppError(404, '게시글을 찾을 수 없습니다.', { code: 'ARTICLE_NOT_FOUND' });
    const inserted = await tx.articleLike.createMany({
      data: [{ userId, articleId }],
      skipDuplicates: true,
    });
    if (inserted.count) {
      await tx.article.update({
        where: { id: articleId },
        data: { likesCount: { increment: 1 } },
      });
    }
  });
  return getArticle(articleId, userId);
}

export async function unlikeArticle(articleId, userId) {
  await prisma.$transaction(async (tx) => {
    const article = await tx.article.findUnique({ where: { id: articleId }, select: { id: true } });
    if (!article) throw new AppError(404, '게시글을 찾을 수 없습니다.', { code: 'ARTICLE_NOT_FOUND' });
    const removed = await tx.articleLike.deleteMany({ where: { userId, articleId } });
    if (removed.count) {
      await tx.article.updateMany({
        where: { id: articleId, likesCount: { gt: 0 } },
        data: { likesCount: { decrement: 1 } },
      });
    }
  });
  return getArticle(articleId, userId);
}
