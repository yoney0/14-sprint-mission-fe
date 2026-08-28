import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import AppError from '../errors/AppError.js';
import { hasCurrentAuthVersion } from '../utils/auth-version.js';
import { verifyAccessToken } from '../utils/tokens.js';

const { JsonWebTokenError, TokenExpiredError } = jwt;

function getAccessToken(req) {
  const header = req.get('authorization');
  if (header) {
    const [scheme, token, extra] = header.trim().split(/\s+/);
    if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
      throw new AppError(401, 'Authorization 헤더 형식이 올바르지 않습니다.', {
        code: 'INVALID_AUTH_HEADER',
      });
    }
    return token;
  }
  return req.cookies?.access_token || '';
}

async function authenticate(req, { required }) {
  const token = getAccessToken(req);
  if (!token) {
    if (required) throw new AppError(401, '로그인이 필요합니다.', { code: 'AUTH_REQUIRED' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== 'access') throw new JsonWebTokenError('invalid token type');
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) throw new JsonWebTokenError('invalid subject');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        image: true,
        authVersion: true,
      },
    });
    if (!user) throw new AppError(401, '사용자를 찾을 수 없습니다.', { code: 'INVALID_TOKEN' });
    if (!hasCurrentAuthVersion(payload, user)) {
      throw new AppError(401, '인증 정보가 변경되어 다시 로그인해야 합니다.', {
        code: 'AUTH_VERSION_MISMATCH',
      });
    }
    const { authVersion: _authVersion, ...publicUser } = user;
    req.user = publicUser;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof TokenExpiredError) {
      throw new AppError(401, '액세스 토큰이 만료되었습니다.', { code: 'ACCESS_TOKEN_EXPIRED' });
    }
    if (error instanceof JsonWebTokenError) {
      throw new AppError(401, '액세스 토큰이 올바르지 않습니다.', { code: 'INVALID_ACCESS_TOKEN' });
    }
    throw error;
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    await authenticate(req, { required: false });
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAuth(req, _res, next) {
  try {
    await authenticate(req, { required: true });
    next();
  } catch (error) {
    next(error);
  }
}
