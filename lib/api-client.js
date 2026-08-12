import axios from 'axios';
import { getAccessToken } from './auth-storage';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://panda-market-api.vercel.app'
).replace(/\/$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getApiErrorMessage(error, fallback = '요청을 처리하지 못했습니다.') {
  return error?.response?.data?.message || error?.message || fallback;
}
