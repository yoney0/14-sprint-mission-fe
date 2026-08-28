'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useCurrentUser from './useCurrentUser';

export default function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useCurrentUser();

  useEffect(() => {
    if (!auth.isCheckingAuth && !auth.isAuthenticated) {
      const nextPath = `${pathname}${window.location.search}`;
      router.replace(`/signin?next=${encodeURIComponent(nextPath)}`);
    }
  }, [auth.isAuthenticated, auth.isCheckingAuth, pathname, router]);

  return auth;
}
