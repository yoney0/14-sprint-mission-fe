import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { assertGoogleConfig, env } from '../config/env.js';
import AppError from '../errors/AppError.js';
import { scheduleRefreshSessionPurge } from './refresh-session-service.js';
import { hasCurrentAuthVersion } from '../utils/auth-version.js';
import { verifyPassword } from '../utils/password-auth.js';
import { serializeUser } from '../utils/serializers.js';
import {
  hashToken,
  signAccessToken,
  signOAuthState,
  signRefreshToken,
  verifyOAuthState,
  verifyRefreshToken,
} from '../utils/tokens.js';

const { JsonWebTokenError, TokenExpiredError } = jwt;

const authUserSelect = {
  id: true,
  email: true,
  nickname: true,
  image: true,
  googleId: true,
  encryptedPassword: true,
  emailVerifiedAt: true,
  authVersion: true,
  createdAt: true,
  updatedAt: true,
};

function tokenWindow(now, absoluteExpiresAt) {
  const slidingExpiry = new Date(now.getTime() + env.refreshTtlSeconds * 1000);
  const expiresAt = slidingExpiry < absoluteExpiresAt ? slidingExpiry : absoluteExpiresAt;
  const expiresInSeconds = Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
  return { expiresAt, expiresInSeconds };
}

function isRecentRotation(revokedAt, now) {
  return revokedAt
    && now.getTime() - revokedAt.getTime() <= env.refreshReuseGraceSeconds * 1000;
}

async function createRefreshSession(client, user, {
  familyId = crypto.randomUUID(),
  absoluteExpiresAt = new Date(Date.now() + env.refreshAbsoluteTtlSeconds * 1000),
} = {}) {
  const now = new Date();
  const { expiresAt, expiresInSeconds } = tokenWindow(now, absoluteExpiresAt);
  if (absoluteExpiresAt <= now) {
    throw new AppError(401, '로그인 세션이 만료되었습니다.', { code: 'SESSION_EXPIRED' });
  }

  const sessionId = crypto.randomUUID();
  const refreshToken = signRefreshToken({
    userId: user.id,
    sessionId,
    familyId,
    authVersion: user.authVersion,
    expiresInSeconds,
  });

  await client.refreshSession.create({
    data: {
      id: sessionId,
      familyId,
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
      absoluteExpiresAt,
    },
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: env.accessTtlSeconds,
  };
}

function authResponse(user, tokens) {
  return { user: serializeUser(user), ...tokens };
}

export async function signup({ email, nickname, password }) {
  scheduleRefreshSessionPurge();
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) throw new AppError(409, '이미 가입된 이메일입니다.', { code: 'EMAIL_IN_USE' });

  const encryptedPassword = await bcrypt.hash(password, 12);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new AppError(409, '이미 가입된 이메일입니다.', { code: 'EMAIL_IN_USE' });

    const user = await tx.user.create({
      data: { email, nickname, encryptedPassword },
      select: authUserSelect,
    });
    const tokens = await createRefreshSession(tx, user);
    return authResponse(user, tokens);
  });
}

export async function signin({ email, password }) {
  scheduleRefreshSessionPurge();
  const user = await prisma.user.findUnique({ where: { email }, select: authUserSelect });
  const valid = await verifyPassword(password, user?.encryptedPassword);
  if (!valid) {
    throw new AppError(401, '이메일 또는 비밀번호가 올바르지 않습니다.', {
      code: 'INVALID_CREDENTIALS',
    });
  }

  const tokens = await createRefreshSession(prisma, user);
  return authResponse(user, tokens);
}

function decodeRefreshToken(refreshToken) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.type !== 'refresh' || !payload.sid || !payload.fid || !payload.sub) {
      throw new JsonWebTokenError('invalid refresh claims');
    }
    return payload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new AppError(401, '리프레시 토큰이 만료되었습니다.', { code: 'REFRESH_TOKEN_EXPIRED' });
    }
    if (error instanceof JsonWebTokenError) {
      throw new AppError(401, '리프레시 토큰이 올바르지 않습니다.', { code: 'INVALID_REFRESH_TOKEN' });
    }
    throw error;
  }
}

export async function refresh(refreshToken) {
  scheduleRefreshSessionPurge();
  if (!refreshToken) {
    throw new AppError(401, '리프레시 토큰이 필요합니다.', { code: 'REFRESH_TOKEN_REQUIRED' });
  }
  const payload = decodeRefreshToken(refreshToken);
  const userId = Number(payload.sub);
  const now = new Date();
  const suppliedHash = hashToken(refreshToken);

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const session = await tx.refreshSession.findUnique({
        where: { id: payload.sid },
        include: { user: { select: authUserSelect } },
      });

      const invalidIdentity = !session
        || session.userId !== userId
        || session.familyId !== payload.fid
        || session.tokenHash !== suppliedHash
        || !hasCurrentAuthVersion(payload, session.user);

      if (invalidIdentity) {
        if (session?.familyId) {
          await tx.refreshSession.updateMany({
            where: { familyId: session.familyId, revokedAt: null },
            data: { revokedAt: now },
          });
        }
        return { error: 'INVALID_REFRESH_TOKEN' };
      }

      if (session.revokedAt) {
        if (isRecentRotation(session.revokedAt, now)) {
          return { error: 'REFRESH_ALREADY_ROTATED' };
        }
        // A rotated token was used again: revoke its whole token family.
        await tx.refreshSession.updateMany({
          where: { familyId: session.familyId, revokedAt: null },
          data: { revokedAt: now },
        });
        return { error: 'REFRESH_TOKEN_REUSED' };
      }

      if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
        await tx.refreshSession.updateMany({
          where: { familyId: session.familyId, revokedAt: null },
          data: { revokedAt: now },
        });
        return { error: 'SESSION_EXPIRED' };
      }

      const claimed = await tx.refreshSession.updateMany({
        where: { id: session.id, tokenHash: suppliedHash, revokedAt: null },
        data: { revokedAt: now },
      });
      if (claimed.count !== 1) {
        return { error: 'REFRESH_ALREADY_ROTATED' };
      }

      const tokens = await createRefreshSession(tx, session.user, {
        familyId: session.familyId,
        absoluteExpiresAt: session.absoluteExpiresAt,
      });
      return authResponse(session.user, tokens);
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (error?.code !== 'P2034') throw error;
    const latest = await prisma.refreshSession.findUnique({
      where: { id: payload.sid },
      select: { familyId: true, userId: true, revokedAt: true },
    });
    if (latest
      && latest.familyId === payload.fid
      && latest.userId === userId
      && isRecentRotation(latest.revokedAt, now)) {
      throw new AppError(409, '다른 요청에서 이미 세션을 갱신했습니다.', {
        code: 'REFRESH_ALREADY_ROTATED',
      });
    }
    await prisma.refreshSession.updateMany({
      where: { familyId: payload.fid, userId, revokedAt: null },
      data: { revokedAt: now },
    });
    throw new AppError(401, '동시에 사용된 리프레시 토큰입니다. 다시 로그인해 주세요.', {
      code: 'REFRESH_TOKEN_REUSED',
    });
  }

  if (result.error) {
    if (result.error === 'REFRESH_ALREADY_ROTATED') {
      throw new AppError(409, '다른 요청에서 이미 세션을 갱신했습니다.', {
        code: result.error,
      });
    }
    const message = result.error === 'REFRESH_TOKEN_REUSED'
      ? '이미 사용된 리프레시 토큰입니다. 다시 로그인해 주세요.'
      : '로그인 세션이 유효하지 않습니다.';
    throw new AppError(401, message, { code: result.error });
  }
  return result;
}

export async function logout(refreshToken) {
  scheduleRefreshSessionPurge();
  if (!refreshToken) return;
  try {
    const payload = decodeRefreshToken(refreshToken);
    await prisma.refreshSession.updateMany({
      where: {
        id: payload.sid,
        familyId: payload.fid,
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  } catch (error) {
    // Logout is idempotent even when the supplied token is already invalid.
    if (!(error instanceof AppError)) throw error;
  }
}

function safeNextPath(value) {
  return typeof value === 'string'
    && value.startsWith('/')
    && !value.startsWith('//')
    && !value.includes('\\')
    && !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : '';
}

export function createGoogleAuthorization({ next = '' } = {}) {
  assertGoogleConfig();
  const state = signOAuthState({ next: safeNextPath(next) });
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleCallbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });
  return { state, url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
}

export function readGoogleState(state, stateCookie) {
  if (!stateCookie || stateCookie !== state) {
    throw new AppError(400, 'OAuth state가 일치하지 않습니다.', { code: 'INVALID_OAUTH_STATE' });
  }
  try {
    const payload = verifyOAuthState(state);
    if (payload.type !== 'oauth-state') throw new JsonWebTokenError('invalid oauth state type');
    return { next: safeNextPath(payload.next) };
  } catch (error) {
    throw new AppError(400, 'OAuth state가 만료되었거나 올바르지 않습니다.', {
      code: 'INVALID_OAUTH_STATE',
    });
  }
}

async function requestGoogleProfile(code) {
  assertGoogleConfig();
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: env.googleCallbackUrl,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new AppError(502, 'Google 토큰 교환에 실패했습니다.', { code: 'GOOGLE_TOKEN_ERROR' });
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified !== true) {
      throw new AppError(502, 'Google 사용자 정보를 확인하지 못했습니다.', {
        code: 'GOOGLE_PROFILE_ERROR',
      });
    }
    return profile;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'Google 인증 서버에 연결하지 못했습니다.', {
      code: 'GOOGLE_CONNECTION_ERROR',
    });
  }
}

export async function signinWithGoogle(code) {
  scheduleRefreshSessionPurge();
  const profile = await requestGoogleProfile(code);
  const email = String(profile.email).trim().toLowerCase();
  const nickname = String(profile.name || email.split('@')[0]).trim().slice(0, 20) || 'Google 사용자';

  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({
      where: { googleId: profile.sub },
      select: authUserSelect,
    });
    if (user) {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          image: user.image || profile.picture || null,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
        },
        select: authUserSelect,
      });
    } else {
      const existingEmail = await tx.user.findUnique({
        where: { email },
        select: authUserSelect,
      });
      if (existingEmail) {
        if (existingEmail.emailVerifiedAt || existingEmail.googleId) {
          throw new AppError(409, '이미 인증된 계정의 이메일입니다.', {
            code: 'GOOGLE_ACCOUNT_LINK_REQUIRED',
          });
        }

        const claimedAt = new Date();
        const claimed = await tx.user.updateMany({
          where: {
            id: existingEmail.id,
            emailVerifiedAt: null,
            googleId: null,
          },
          data: {
            nickname,
            image: profile.picture || null,
            googleId: profile.sub,
            encryptedPassword: null,
            emailVerifiedAt: claimedAt,
            authVersion: { increment: 1 },
          },
        });
        if (claimed.count !== 1) {
          throw new AppError(409, '계정 인증 상태가 변경되었습니다. 다시 시도해 주세요.', {
            code: 'GOOGLE_ACCOUNT_CONFLICT',
          });
        }
        await tx.refreshSession.updateMany({
          where: { userId: existingEmail.id, revokedAt: null },
          data: { revokedAt: claimedAt },
        });
        user = await tx.user.findUnique({
          where: { id: existingEmail.id },
          select: authUserSelect,
        });
      } else {
        user = await tx.user.create({
          data: {
            email,
            nickname,
            image: profile.picture || null,
            googleId: profile.sub,
            encryptedPassword: null,
            emailVerifiedAt: new Date(),
          },
          select: authUserSelect,
        });
      }
    }
    const tokens = await createRefreshSession(tx, user);
    return authResponse(user, tokens);
  });
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: authUserSelect });
  if (!user) throw new AppError(404, '사용자를 찾을 수 없습니다.', { code: 'USER_NOT_FOUND' });
  return serializeUser(user);
}
