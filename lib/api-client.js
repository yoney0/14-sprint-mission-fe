import axios from 'axios';
import {
  clearAuthTokens,
  getAccessToken,
  saveAuthTokens,
} from './auth-storage';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
).replace(/\/$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
});

let refreshPromise = null;

async function refreshSession() {
  async function rotateOrReuseCookieSession() {
    try {
      await refreshClient.get('/users/me');
      // Another tab may have refreshed the shared HttpOnly cookies while this
      // request was waiting for the cross-tab lock. Drop the stale memory token.
      clearAuthTokens();
      return '';
    } catch (error) {
      if (error.response?.status !== 401) throw error;
    }

    const { data } = await refreshClient.post('/auth/refresh', {});
    saveAuthTokens(data);
    return data.accessToken;
  }

  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('panda-market-refresh', rotateOrReuseCookieSession);
  }
  return rotateOrReuseCookieSession();
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const isUnauthorized = error.response?.status === 401;
    const isAuthRequest = /\/auth\/(signin|signup|refresh)$/.test(request?.url || '');

    if (!isUnauthorized || !request || request._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    request._retry = true;
    refreshPromise ||= refreshSession().finally(() => {
      refreshPromise = null;
    });

    try {
      const accessToken = await refreshPromise;
      request.headers = request.headers || {};
      if (accessToken) request.headers.Authorization = `Bearer ${accessToken}`;
      else delete request.headers.Authorization;
      return apiClient(request);
    } catch (refreshError) {
      clearAuthTokens();
      return Promise.reject(refreshError);
    }
  },
);

export function getApiErrorMessage(error, fallback = '요청을 처리하지 못했습니다.') {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
  if (!error?.response) {
    if (error?.message && error.message !== 'Network Error') return error.message;
    return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.';
  }

  if (status === 400 || status === 422) return '입력한 내용을 다시 확인해주세요.';
  if (status === 401) return '로그인이 만료되었습니다. 다시 로그인해주세요.';
  if (status === 403) return '이 작업을 수행할 권한이 없습니다.';
  if (status === 404) return '요청한 정보를 찾을 수 없습니다.';
  if (status === 409) return '이미 사용 중인 정보이거나 현재 상태와 충돌합니다.';
  if (status === 413) return '업로드한 파일의 크기가 너무 큽니다.';
  if (status === 429) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  if (status >= 500) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  return fallback;
}
