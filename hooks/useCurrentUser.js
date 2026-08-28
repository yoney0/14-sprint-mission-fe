'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { clearAuthTokens, subscribeAuth } from '@/lib/auth-storage';
import { userApi } from '@/lib/panda-api';
import { invalidateViewerScopedQueries, queryKeys } from '@/lib/query-keys';
import useHydrated from './useHydrated';

export default function useCurrentUser() {
  const queryClient = useQueryClient();
  const isHydrated = useHydrated();

  const query = useQuery({
    queryKey: queryKeys.user,
    queryFn: userApi.getMe,
    enabled: isHydrated,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (query.error?.response?.status === 401) {
      clearAuthTokens();
      queryClient.setQueryData(queryKeys.user, null);
      invalidateViewerScopedQueries(queryClient);
    }
  }, [query.error, queryClient]);

  const { refetch } = query;
  useEffect(() => subscribeAuth(() => {
    void refetch();
  }), [refetch]);

  return {
    ...query,
    isCheckingAuth: !isHydrated || query.isPending,
    isAuthenticated: Boolean(query.data) && query.error?.response?.status !== 401,
  };
}
