import path from 'node:path';
import { readdir, stat, unlink } from 'node:fs/promises';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import AppError from '../errors/AppError.js';

const uploadFilenamePattern = /^([1-9]\d*)-([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(?:jpe?g|png|webp|gif)$/i;

export function uploadFilenameFromReference(reference) {
  if (typeof reference !== 'string'
    || !reference.startsWith('/uploads/')
    || reference.startsWith('//')
    || reference.includes('\\')
    || reference.includes('?')
    || reference.includes('#')) return '';
  let filename;
  try {
    filename = decodeURIComponent(reference.slice('/uploads/'.length));
  } catch {
    return '';
  }
  if (filename.includes('/') || !uploadFilenamePattern.test(filename)) return '';
  return filename;
}

export async function assertOwnedImageReferences(urls, userId, existingUrls = []) {
  const existing = new Set(existingUrls);
  for (const url of urls || []) {
    if (existing.has(url)) continue;
    const filename = uploadFilenameFromReference(url);
    const ownerId = Number(filename.match(uploadFilenamePattern)?.[1]);
    if (!filename || ownerId !== userId) {
      throw new AppError(400, '본인이 업로드한 이미지 경로만 사용할 수 있습니다.', {
        code: 'INVALID_IMAGE_REFERENCE',
      });
    }
    try {
      const metadata = await stat(path.join(env.uploadDirectory, filename));
      if (!metadata.isFile()) throw new Error('not a file');
    } catch {
      throw new AppError(400, '업로드된 이미지 파일을 찾을 수 없습니다.', {
        code: 'IMAGE_FILE_NOT_FOUND',
      });
    }
  }
}

async function referencedUploadFilenames(userId) {
  const needle = `/uploads/${userId}-`;
  const [productImages, articleImages, products, articles] = await Promise.all([
    prisma.productImage.findMany({ where: { url: { contains: needle } }, select: { url: true } }),
    prisma.articleImage.findMany({ where: { url: { contains: needle } }, select: { url: true } }),
    prisma.product.findMany({ where: { image: { contains: needle } }, select: { image: true } }),
    prisma.article.findMany({ where: { image: { contains: needle } }, select: { image: true } }),
  ]);
  return new Set(
    [...productImages, ...articleImages, ...products, ...articles]
      .map((row) => uploadFilenameFromReference(row.url || row.image))
      .filter(Boolean),
  );
}

async function ownedFiles(userId) {
  const entries = await readdir(env.uploadDirectory, { withFileTypes: true });
  const prefix = `${userId}-`;
  return entries
    .filter((entry) => entry.isFile() && entry.name.startsWith(prefix) && uploadFilenamePattern.test(entry.name))
    .map((entry) => entry.name);
}

async function allUploadFiles() {
  const entries = await readdir(env.uploadDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && uploadFilenamePattern.test(entry.name))
    .map((entry) => entry.name);
}

export async function pruneAbandonedUploads(userId) {
  const files = await ownedFiles(userId);
  const referenced = await referencedUploadFilenames(userId);
  const cutoff = Date.now() - env.uploadOrphanTtlSeconds * 1000;

  await Promise.allSettled(files.map(async (filename) => {
    if (referenced.has(filename)) return;
    const filePath = path.join(env.uploadDirectory, filename);
    const metadata = await stat(filePath);
    if (metadata.mtimeMs < cutoff) await unlink(filePath);
  }));
}

export async function pruneAllAbandonedUploads() {
  const [files, productImages, articleImages, products, articles] = await Promise.all([
    allUploadFiles(),
    prisma.productImage.findMany({
      where: { url: { startsWith: '/uploads/' } },
      select: { url: true },
    }),
    prisma.articleImage.findMany({
      where: { url: { startsWith: '/uploads/' } },
      select: { url: true },
    }),
    prisma.product.findMany({
      where: { image: { startsWith: '/uploads/' } },
      select: { image: true },
    }),
    prisma.article.findMany({
      where: { image: { startsWith: '/uploads/' } },
      select: { image: true },
    }),
  ]);
  const referenced = new Set(
    [...productImages, ...articleImages, ...products, ...articles]
      .map((row) => uploadFilenameFromReference(row.url || row.image))
      .filter(Boolean),
  );
  const cutoff = Date.now() - env.uploadOrphanTtlSeconds * 1000;

  const results = await Promise.allSettled(files.map(async (filename) => {
    if (referenced.has(filename)) return false;
    const filePath = path.join(env.uploadDirectory, filename);
    const metadata = await stat(filePath);
    if (metadata.mtimeMs >= cutoff) return false;
    await unlink(filePath);
    return true;
  }));

  return results.filter((result) => result.status === 'fulfilled' && result.value).length;
}

export async function enforceUserUploadQuota(userId, newFiles = []) {
  const files = await ownedFiles(userId);
  const metadata = await Promise.all(files.map(async (filename) => ({
    filename,
    size: (await stat(path.join(env.uploadDirectory, filename))).size,
  })));
  const totalBytes = metadata.reduce((sum, file) => sum + file.size, 0);

  if (files.length > env.uploadMaxFilesPerUser || totalBytes > env.uploadMaxBytesPerUser) {
    await Promise.allSettled(newFiles.map((file) => unlink(file.path)));
    throw new AppError(429, '사용자별 이미지 저장 한도를 초과했습니다.', {
      code: 'UPLOAD_QUOTA_EXCEEDED',
    });
  }
}

async function isUploadReferenced(filename) {
  const suffix = `/uploads/${filename}`;
  const [productImages, articleImages, products, articles] = await Promise.all([
    prisma.productImage.count({ where: { url: { endsWith: suffix } } }),
    prisma.articleImage.count({ where: { url: { endsWith: suffix } } }),
    prisma.product.count({ where: { image: { endsWith: suffix } } }),
    prisma.article.count({ where: { image: { endsWith: suffix } } }),
  ]);
  return productImages + articleImages + products + articles > 0;
}

export async function removeUnreferencedUploads(references = []) {
  const filenames = [...new Set(references.map(uploadFilenameFromReference).filter(Boolean))];
  await Promise.allSettled(filenames.map(async (filename) => {
    if (await isUploadReferenced(filename)) return;
    await unlink(path.join(env.uploadDirectory, filename));
  }));
}
