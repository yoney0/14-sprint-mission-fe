import { Prisma } from '@prisma/client';
import multer from 'multer';
import AppError from '../errors/AppError.js';

function normalizeError(error) {
  if (error instanceof AppError) return error;

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return new AppError(400, 'JSON 요청 본문이 올바르지 않습니다.', {
      code: 'INVALID_JSON',
    });
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError(413, '업로드 이미지는 파일당 허용 크기를 초과할 수 없습니다.', {
        code: error.code,
      });
    }
    return new AppError(400, error.message || '이미지 업로드 요청이 올바르지 않습니다.', {
      code: error.code,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (['P2000', 'P2011', 'P2012', 'P2013', 'P2019', 'P2020', 'P2023'].includes(error.code)) {
      return new AppError(400, '데이터베이스에 전달된 요청 값이 올바르지 않습니다.', {
        code: 'INVALID_DATABASE_INPUT',
      });
    }
    if (error.code === 'P2002') {
      return new AppError(409, '이미 사용 중인 값입니다.', { code: 'CONFLICT' });
    }
    if (error.code === 'P2003') {
      return new AppError(409, '연결된 데이터 때문에 요청을 처리할 수 없습니다.', {
        code: 'RELATION_CONFLICT',
      });
    }
    if (error.code === 'P2025') {
      return new AppError(404, '요청한 리소스를 찾을 수 없습니다.', { code: 'NOT_FOUND' });
    }
    if (error.code === 'P2034') {
      return new AppError(409, '동시 요청과 충돌했습니다. 다시 시도해 주세요.', {
        code: 'TRANSACTION_CONFLICT',
      });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(400, '데이터베이스 요청 값이 올바르지 않습니다.', {
      code: 'INVALID_DATABASE_QUERY',
    });
  }

  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
    return new AppError(error.status, error.message || '요청을 처리하지 못했습니다.');
  }

  return new AppError(500, '서버 오류가 발생했습니다.', { code: 'INTERNAL_SERVER_ERROR' });
}

export default function errorHandler(error, _req, res, _next) {
  const normalized = normalizeError(error);
  if (normalized.status >= 500) console.error(error);

  res.status(normalized.status).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
    },
    // Kept for compatibility with the existing frontend error reader.
    message: normalized.message,
  });
}
