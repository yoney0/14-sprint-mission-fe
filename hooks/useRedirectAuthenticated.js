'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useCurrentUser from './useCurrentUser';
import { getSafeNextPath } from '@/lib/auth-storage';

export default function useRedirectAuthenticated(nextPath = '/items') {
  const router = useRouter();
  const auth = useCurrentUser();

  useEffect(() => {
    if (auth.isAuthenticated) router.replace(getSafeNextPath(nextPath));
  }, [auth.isAuthenticated, nextPath, router]);

  return auth.isCheckingAuth || auth.isAuthenticated;
}
