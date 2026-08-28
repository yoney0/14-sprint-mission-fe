export const AUTH_NEXT_PATH_KEY = 'panda-market-auth-next';
const AUTH_CHANGE_EVENT = 'panda-market-auth-change';
const AUTH_CHANGE_SIGNAL_KEY = 'panda-market-auth-signal';
const LEGACY_TOKEN_KEYS = ['accessToken', 'refreshToken'];
let volatileAccessToken = '';

export function getAccessToken() {
  return volatileAccessToken;
}

function notifyAuthChange() {
  if (typeof window === 'undefined') return;
  for (const key of LEGACY_TOKEN_KEYS) window.localStorage.removeItem(key);
  window.localStorage.setItem(AUTH_CHANGE_SIGNAL_KEY, String(Date.now()));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function saveAuthTokens({ accessToken }) {
  if (!accessToken) return;
  volatileAccessToken = accessToken;
  notifyAuthChange();
}

export function clearAuthTokens() {
  const hadAccessToken = Boolean(volatileAccessToken);
  volatileAccessToken = '';
  if (hadAccessToken) notifyAuthChange();
  else if (typeof window !== 'undefined') {
    for (const key of LEGACY_TOKEN_KEYS) window.localStorage.removeItem(key);
  }
}

export function subscribeAuth(listener) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  const onStorage = (event) => {
    if (event.key === AUTH_CHANGE_SIGNAL_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function getSafeNextPath(value, fallback = '/items') {
  const path = String(value || '').trim();
  if (!path.startsWith('/')
    || path.startsWith('//')
    || path.includes('\\')
    || /[\u0000-\u001f\u007f]/.test(path)) return fallback;
  return path;
}

export function saveAuthNextPath(path) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(AUTH_NEXT_PATH_KEY, getSafeNextPath(path));
}

export function consumeAuthNextPath(fallback = '/items') {
  if (typeof window === 'undefined') return fallback;
  const path = getSafeNextPath(window.sessionStorage.getItem(AUTH_NEXT_PATH_KEY), fallback);
  window.sessionStorage.removeItem(AUTH_NEXT_PATH_KEY);
  return path;
}
