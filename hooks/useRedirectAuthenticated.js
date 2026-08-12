'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { getAccessToken, subscribeAuth } from '@/lib/auth-storage';
import useHydrated from './useHydrated';

export default function useRedirectAuthenticated() {
  const router = useRouter();
  const token = useSyncExternalStore(subscribeAuth, getAccessToken, () => '');
  const isHydrated = useHydrated();

  useEffect(() => {
    if (token) router.replace('/items');
  }, [router, token]);

  return !isHydrated || Boolean(token);
}
