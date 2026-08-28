import { rateLimit } from 'express-rate-limit';

function limiter({ windowMs, limit, code, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code, message }, message },
  });
}

export const signupRateLimit = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  code: 'SIGNUP_RATE_LIMITED',
  message: '회원가입 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
});

export const signinRateLimit = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  code: 'SIGNIN_RATE_LIMITED',
  message: '로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
});

export const refreshRateLimit = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  code: 'REFRESH_RATE_LIMITED',
  message: '세션 갱신 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
});

export const oauthRateLimit = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  code: 'OAUTH_RATE_LIMITED',
  message: 'Google 로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
});

export const uploadRateLimit = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  code: 'UPLOAD_RATE_LIMITED',
  message: '이미지 업로드 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
});
