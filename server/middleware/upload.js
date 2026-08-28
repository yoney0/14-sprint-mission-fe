import crypto from 'node:crypto';
import fs from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import multer from 'multer';
import { env } from '../config/env.js';
import AppError from '../errors/AppError.js';
import {
  enforceUserUploadQuota,
  pruneAbandonedUploads,
} from '../services/upload-service.js';

fs.mkdirSync(env.uploadDirectory, { recursive: true });

const extensionByMime = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const storage = multer.diskStorage({
  destination: env.uploadDirectory,
  filename(req, file, callback) {
    callback(null, `${req.user.id}-${crypto.randomUUID()}${extensionByMime.get(file.mimetype)}`);
  },
});

const imageUpload = multer({
  storage,
  limits: {
    fileSize: env.maxImageBytes,
    files: 3,
    fields: 0,
    parts: 3,
    fieldNameSize: 100,
    headerPairs: 100,
  },
  fileFilter(_req, file, callback) {
    if (!extensionByMime.has(file.mimetype)) {
      const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
      error.message = 'JPEG, PNG, WEBP, GIF 이미지 파일만 업로드할 수 있습니다.';
      callback(error);
      return;
    }
    callback(null, true);
  },
});

async function removeRequestFiles(req) {
  await Promise.allSettled((req.files || []).map((file) => unlink(file.path)));
}

export async function prepareImageUpload(req, _res, next) {
  try {
    await pruneAbandonedUploads(req.user.id);
    await enforceUserUploadQuota(req.user.id);
    next();
  } catch (error) {
    next(error);
  }
}

export function uploadImages(req, res, next) {
  imageUpload.array('images', 3)(req, res, async (error) => {
    if (error) await removeRequestFiles(req);
    next(error);
  });
}

function hasExpectedSignature(file, bytes) {
  if (file.mimetype === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.mimetype === 'image/png') {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (file.mimetype === 'image/gif') {
    const header = bytes.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }
  if (file.mimetype === 'image/webp') {
    return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

export async function verifyImageSignatures(req, _res, next) {
  try {
    const files = req.files || [];
    const signatures = await Promise.all(files.map(async (file) => ({
      file,
      valid: hasExpectedSignature(file, await readFile(file.path)),
    })));
    if (signatures.some(({ valid }) => !valid)) {
      await Promise.allSettled(files.map((file) => unlink(file.path)));
      throw new AppError(400, '파일 내용이 올바른 이미지 형식이 아닙니다.', {
        code: 'INVALID_IMAGE_CONTENT',
      });
    }
    next();
  } catch (error) {
    await Promise.allSettled((req.files || []).map((file) => unlink(file.path)));
    next(error);
  }
}

export async function verifyUploadQuota(req, _res, next) {
  try {
    await enforceUserUploadQuota(req.user.id, req.files || []);
    next();
  } catch (error) {
    next(error);
  }
}
