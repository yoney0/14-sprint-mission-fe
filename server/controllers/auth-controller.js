import { env } from '../config/env.js';
import AppError from '../errors/AppError.js';
import * as authService from '../services/auth-service.js';

const accessCookie = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'lax',
  path: '/api',
  maxAge: env.accessTtlSeconds * 1000,
};

const refreshCookie = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: env.refreshTtlSeconds * 1000,
};

function setTokenCookies(res, result) {
  res.cookie('access_token', result.accessToken, accessCookie);
  res.cookie('refresh_token', result.refreshToken, refreshCookie);
}

function publicAuthResult({ refreshToken: _refreshToken, ...result }) {
  return result;
}

function clearTokenCookies(res) {
  res.clearCookie('access_token', accessCookie);
  res.clearCookie('refresh_token', refreshCookie);
}

function readRefreshToken(req) {
  return req.validated?.body?.refreshToken || req.cookies?.refresh_token || '';
}

function oauthAppOrigin() {
  const configuredRedirect = env.googleSuccessRedirect || env.clientOrigins[0];
  if (!configuredRedirect) throw new AppError(500, 'OAuth 성공 리다이렉트 주소가 없습니다.');
  const parsed = new URL(configuredRedirect);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError(500, 'OAuth 성공 리다이렉트 주소가 올바르지 않습니다.');
  }
  return parsed.origin;
}

function redirectOAuthFailure(res, code, appOrigin = oauthAppOrigin()) {
  const destination = new URL('/oauth/callback', appOrigin);
  destination.hash = new URLSearchParams({ error: code }).toString();
  res.redirect(302, destination.toString());
}

function oauthFailureCode(error) {
  if (error?.code === 'GOOGLE_ACCOUNT_LINK_REQUIRED') return 'account_link_required';
  if (['GOOGLE_TOKEN_ERROR', 'GOOGLE_PROFILE_ERROR', 'GOOGLE_CONNECTION_ERROR'].includes(error?.code)) {
    return 'provider_error';
  }
  return 'oauth_failed';
}

export async function signup(req, res) {
  const result = await authService.signup(req.validated.body);
  setTokenCookies(res, result);
  res.status(201).json(publicAuthResult(result));
}

export async function signin(req, res) {
  const result = await authService.signin(req.validated.body);
  setTokenCookies(res, result);
  res.status(200).json(publicAuthResult(result));
}

export async function refresh(req, res) {
  const result = await authService.refresh(readRefreshToken(req));
  setTokenCookies(res, result);
  res.status(200).json(publicAuthResult(result));
}

export async function logout(req, res) {
  await authService.logout(readRefreshToken(req));
  clearTokenCookies(res);
  res.status(204).send();
}

export function googleStart(req, res) {
  const authorization = authService.createGoogleAuthorization(req.validated.query);
  res.cookie('oauth_state', authorization.state, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(302, authorization.url);
}

export async function googleCallback(req, res) {
  const { code, error: providerError, state } = req.validated.query;
  const appOrigin = oauthAppOrigin();
  let stateData;
  try {
    stateData = authService.readGoogleState(state, req.cookies?.oauth_state);
  } catch {
    res.clearCookie('oauth_state', { path: '/api/auth/google' });
    redirectOAuthFailure(res, 'invalid_state', appOrigin);
    return;
  }
  res.clearCookie('oauth_state', { path: '/api/auth/google' });

  if (providerError) {
    redirectOAuthFailure(res, providerError === 'access_denied' ? 'access_denied' : 'provider_error', appOrigin);
    return;
  }

  let result;
  try {
    result = await authService.signinWithGoogle(code);
  } catch (oauthError) {
    if (oauthError?.status >= 500) console.error('Google OAuth callback failed:', oauthError);
    redirectOAuthFailure(res, oauthFailureCode(oauthError), appOrigin);
    return;
  }
  setTokenCookies(res, result);

  const destination = new URL(stateData.next || '/items', appOrigin);
  if (destination.origin !== appOrigin) {
    throw new AppError(400, 'OAuth 리다이렉트 경로가 올바르지 않습니다.', {
      code: 'INVALID_OAUTH_REDIRECT',
    });
  }
  destination.searchParams.set('oauth', 'success');
  res.redirect(302, destination.toString());
}

export async function me(req, res) {
  res.status(200).json(await authService.getCurrentUser(req.user.id));
}
