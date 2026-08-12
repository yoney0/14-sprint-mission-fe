'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import { clearAuthTokens, getAccessToken, subscribeAuth } from '@/lib/auth-storage';
import { userApi } from '@/lib/panda-api';
import { queryKeys } from '@/lib/query-keys';
import useHydrated from './useHydrated';

export default function useCurrentUser() {
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, () => '');
  const isHydrated = useHydrated();

  const query = useQuery({
    queryKey: queryKeys.user,
    queryFn: userApi.getMe,
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (query.error?.response?.status === 401) {
      clearAuthTokens();
    }
  }, [query.error]);

  return {
    ...query,
    token,
    isCheckingAuth: !isHydrated,
    isAuthenticated: Boolean(token),
  };
}
