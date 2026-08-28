import prisma from '../config/prisma.js';
import AppError from '../errors/AppError.js';
import { clampBestLimit, getPagination } from '../utils/pagination.js';
import { serializeProduct } from '../utils/serializers.js';
import { productSelect } from './selectors.js';
import {
  assertOwnedImageReferences,
  removeUnreferencedUploads,
} from './upload-service.js';

function productOrder(orderBy) {
  return orderBy === 'like'
    ? [{ likesCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
    : [{ createdAt: 'desc' }, { id: 'desc' }];
}

function uniqueTags(tags = []) {
  return [...new Set(tags)];
}

function readImageUrls(input, { create = false } = {}) {
  if (Object.prototype.hasOwnProperty.call(input, 'images')) return input.images || [];
  return create ? [] : undefined;
}

async function ensureOwnedProduct(client, productId, userId) {
  const product = await client.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      ownerId: true,
      image: true,
      images: { select: { url: true } },
    },
  });
  if (!product) throw new AppError(404, '상품을 찾을 수 없습니다.', { code: 'PRODUCT_NOT_FOUND' });
  if (product.ownerId !== userId) {
    throw new AppError(403, '상품을 등록한 사용자만 변경할 수 있습니다.', { code: 'FORBIDDEN' });
  }
  return product;
}

export async function listProducts({ page, pageSize, keyword, orderBy }, userId) {
  const { skip, take } = getPagination({ page, pageSize });
  const where = keyword ? {
    OR: [
      { name: { contains: keyword, mode: 'insensitive' } },
      { description: { contains: keyword, mode: 'insensitive' } },
    ],
  } : {};

  const [totalCount, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: productOrder(orderBy),
      select: productSelect(userId),
    }),
  ]);

  return {
    list: products.map(serializeProduct),
    totalCount,
    page,
    pageSize,
    orderBy,
  };
}

export async function listBestProducts(limit, userId) {
  const take = clampBestLimit(limit);
  const products = await prisma.product.findMany({
    take,
    orderBy: productOrder('like'),
    select: productSelect(userId),
  });
  return {
    list: products.map(serializeProduct),
    totalCount: products.length,
    page: 1,
    pageSize: take,
    orderBy: 'like',
  };
}

export async function getProduct(productId, userId) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: productSelect(userId, { includeComments: true }),
  });
  if (!product) throw new AppError(404, '상품을 찾을 수 없습니다.', { code: 'PRODUCT_NOT_FOUND' });
  return serializeProduct(product);
}

export async function createProduct(input, userId) {
  const imageUrls = readImageUrls(input, { create: true });
  await assertOwnedImageReferences(imageUrls, userId);
  const product = await prisma.product.create({
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      tags: uniqueTags(input.tags),
      image: imageUrls[0] || null,
      ownerId: userId,
      ...(imageUrls.length ? {
        images: {
          create: imageUrls.map((url, position) => ({ url, position })),
        },
      } : {}),
    },
    select: productSelect(userId),
  });
  return serializeProduct(product);
}

export async function updateProduct(productId, input, userId) {
  const imageUrls = readImageUrls(input);
  const result = await prisma.$transaction(async (tx) => {
    const existing = await ensureOwnedProduct(tx, productId, userId);
    const existingUrls = [existing.image, ...existing.images.map(({ url }) => url)].filter(Boolean);
    if (imageUrls !== undefined) {
      await assertOwnedImageReferences(imageUrls, userId, existingUrls);
    }
    const data = {};
    for (const field of ['name', 'description', 'price']) {
      if (Object.prototype.hasOwnProperty.call(input, field)) data[field] = input[field];
    }
    if (Object.prototype.hasOwnProperty.call(input, 'tags')) data.tags = uniqueTags(input.tags);
    if (imageUrls !== undefined) {
      data.image = imageUrls[0] || null;
      data.images = {
        deleteMany: {},
        ...(imageUrls.length ? {
          create: imageUrls.map((url, position) => ({ url, position })),
        } : {}),
      };
    }

    const product = await tx.product.update({
      where: { id: productId },
      data,
      select: productSelect(userId),
    });
    return {
      product,
      removedImageUrls: imageUrls === undefined
        ? []
        : existingUrls.filter((url) => !imageUrls.includes(url)),
    };
  });
  await removeUnreferencedUploads(result.removedImageUrls);
  return serializeProduct(result.product);
}

export async function deleteProduct(productId, userId) {
  const removedImageUrls = await prisma.$transaction(async (tx) => {
    const existing = await ensureOwnedProduct(tx, productId, userId);
    await tx.product.delete({ where: { id: productId } });
    return [existing.image, ...existing.images.map(({ url }) => url)].filter(Boolean);
  });
  await removeUnreferencedUploads(removedImageUrls);
}

export async function likeProduct(productId, userId) {
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new AppError(404, '상품을 찾을 수 없습니다.', { code: 'PRODUCT_NOT_FOUND' });
    const inserted = await tx.productLike.createMany({
      data: [{ userId, productId }],
      skipDuplicates: true,
    });
    if (inserted.count) {
      await tx.product.update({
        where: { id: productId },
        data: { likesCount: { increment: 1 } },
      });
    }
  });
  return getProduct(productId, userId);
}

export async function unlikeProduct(productId, userId) {
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new AppError(404, '상품을 찾을 수 없습니다.', { code: 'PRODUCT_NOT_FOUND' });
    const removed = await tx.productLike.deleteMany({ where: { userId, productId } });
    if (removed.count) {
      await tx.product.updateMany({
        where: { id: productId, likesCount: { gt: 0 } },
        data: { likesCount: { decrement: 1 } },
      });
    }
  });
  return getProduct(productId, userId);
}
