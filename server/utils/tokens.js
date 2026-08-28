import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

function requireSecret(secret, name) {
  if (!secret) throw new Error(`${name} 환경 변수가 설정되지 않았습니다.`);
  return secret;
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      type: 'access',
      email: user.email,
      nickname: user.nickname,
      ver: user.authVersion,
    },
    requireSecret(env.accessSecret, 'JWT_ACCESS_SECRET'),
    { subject: String(user.id), expiresIn: env.accessTtlSeconds, algorithm: 'HS256' },
  );
}

export function signRefreshToken({
  userId,
  sessionId,
  familyId,
  authVersion,
  expiresInSeconds,
}) {
  return jwt.sign(
    {
      type: 'refresh', sid: sessionId, fid: familyId, ver: authVersion,
    },
    requireSecret(env.refreshSecret, 'JWT_REFRESH_SECRET'),
    { subject: String(userId), expiresIn: expiresInSeconds, algorithm: 'HS256' },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, requireSecret(env.accessSecret, 'JWT_ACCESS_SECRET'), {
    algorithms: ['HS256'],
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, requireSecret(env.refreshSecret, 'JWT_REFRESH_SECRET'), {
    algorithms: ['HS256'],
  });
}

export function signOAuthState({ next = '' } = {}) {
  return jwt.sign(
    { type: 'oauth-state', nonce: crypto.randomUUID(), next },
    requireSecret(env.accessSecret, 'JWT_ACCESS_SECRET'),
    { expiresIn: 600, algorithm: 'HS256' },
  );
}

export function verifyOAuthState(token) {
  return jwt.verify(token, requireSecret(env.accessSecret, 'JWT_ACCESS_SECRET'), {
    algorithms: ['HS256'],
  });
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
