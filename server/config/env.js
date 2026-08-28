import 'dotenv/config';
import path from 'node:path';

function readPositiveInteger(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} 환경 변수는 양의 정수여야 합니다.`);
  }
  return value;
}

function readOrigins() {
  const configured = process.env.CLIENT_ORIGIN
    || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
  return configured.split(',').map((origin) => origin.trim()).filter(Boolean).map((origin) => {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)
      || parsed.origin !== origin.replace(/\/$/, '')
      || parsed.username
      || parsed.password) {
      throw new Error('CLIENT_ORIGIN은 경로가 없는 정확한 HTTP(S) origin이어야 합니다.');
    }
    return parsed.origin;
  });
}

function readTrustProxy() {
  const value = process.env.TRUST_PROXY ?? '0';
  if (value === 'false') return false;
  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
    throw new Error('TRUST_PROXY는 false 또는 0~10 사이의 정수여야 합니다.');
  }
  return hops;
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: readPositiveInteger('PORT', 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  clientOrigins: readOrigins(),
  trustProxy: readTrustProxy(),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  uploadDirectory: process.env.UPLOAD_DIRECTORY
    ? path.resolve(process.env.UPLOAD_DIRECTORY)
    : path.join(process.cwd(), 'public', 'uploads'),
  maxImageBytes: readPositiveInteger('MAX_IMAGE_BYTES', 5 * 1024 * 1024),
  uploadMaxFilesPerUser: readPositiveInteger('UPLOAD_MAX_FILES_PER_USER', 60),
  uploadMaxBytesPerUser: readPositiveInteger('UPLOAD_MAX_BYTES_PER_USER', 300 * 1024 * 1024),
  uploadOrphanTtlSeconds: readPositiveInteger('UPLOAD_ORPHAN_TTL_SECONDS', 24 * 60 * 60),
  uploadSweepIntervalSeconds: readPositiveInteger('UPLOAD_SWEEP_INTERVAL_SECONDS', 60 * 60),
  accessSecret: process.env.JWT_ACCESS_SECRET || '',
  refreshSecret: process.env.JWT_REFRESH_SECRET || '',
  accessTtlSeconds: readPositiveInteger('JWT_ACCESS_TTL_SECONDS', 900),
  refreshTtlSeconds: readPositiveInteger('JWT_REFRESH_TTL_SECONDS', 60 * 60 * 24 * 14),
  refreshAbsoluteTtlSeconds: readPositiveInteger(
    'JWT_REFRESH_ABSOLUTE_TTL_SECONDS',
    60 * 60 * 24 * 30,
  ),
  refreshReuseGraceSeconds: readPositiveInteger('JWT_REFRESH_REUSE_GRACE_SECONDS', 5),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
  googleSuccessRedirect: process.env.GOOGLE_OAUTH_SUCCESS_REDIRECT || '',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
});

export function assertRuntimeConfig() {
  const missing = [];
  if (!env.databaseUrl) missing.push('DATABASE_URL');
  if (!env.accessSecret) missing.push('JWT_ACCESS_SECRET');
  if (!env.refreshSecret) missing.push('JWT_REFRESH_SECRET');
  if (env.nodeEnv === 'production' && !env.clientOrigins.length) missing.push('CLIENT_ORIGIN');

  if (missing.length) {
    throw new Error(`필수 환경 변수가 없습니다: ${missing.join(', ')}`);
  }
  if (env.accessSecret.length < 32 || env.refreshSecret.length < 32) {
    throw new Error('JWT 비밀키는 각각 32자 이상이어야 합니다.');
  }
  if (env.nodeEnv === 'production'
    && (env.accessSecret.startsWith('replace-with-') || env.refreshSecret.startsWith('replace-with-'))) {
    throw new Error('운영 환경에서는 예시 JWT 비밀키를 사용할 수 없습니다.');
  }
  if (env.accessSecret === env.refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET과 JWT_REFRESH_SECRET은 서로 달라야 합니다.');
  }
  if (env.nodeEnv === 'production'
    && env.clientOrigins.some((origin) => /:\/\/(?:localhost|127\.0\.0\.1)(?::|$)/i.test(origin))) {
    throw new Error('운영 환경 CLIENT_ORIGIN에는 localhost를 사용할 수 없습니다.');
  }
}

export function assertGoogleConfig() {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleCallbackUrl) {
    const error = new Error('Google OAuth 환경 변수가 설정되지 않았습니다.');
    error.status = 503;
    throw error;
  }
}
