'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { consumeAuthNextPath } from '@/lib/auth-storage';
import { userApi } from '@/lib/panda-api';
import { invalidateViewerScopedQueries, queryKeys } from '@/lib/query-keys';

const OAUTH_ERROR_MESSAGES = {
  access_denied: 'Google 로그인이 취소되었습니다.',
  account_link_required: '이미 가입된 이메일입니다. 기존 로그인 방식으로 먼저 인증해 주세요.',
  invalid_state: '로그인 요청이 만료되었습니다. 다시 시도해 주세요.',
  provider_error: 'Google 인증을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  oauth_failed: 'Google 로그인 정보를 확인하지 못했습니다.',
};

export default function OAuthCallbackPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const oauthError = params.get('error');

    async function finishOAuth() {
      if (oauthError) {
        await Promise.resolve();
        setError(OAUTH_ERROR_MESSAGES[oauthError] || OAUTH_ERROR_MESSAGES.oauth_failed);
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      try {
        const user = await userApi.getMe();
        queryClient.setQueryData(queryKeys.user, user);
        invalidateViewerScopedQueries(queryClient);
        window.history.replaceState(null, '', window.location.pathname);
        router.replace(consumeAuthNextPath());
      } catch {
        setError(OAUTH_ERROR_MESSAGES.oauth_failed);
      }
    }

    void finishOAuth();
    return undefined;
  }, [queryClient, router]);

  if (error) {
    return (
      <div className="oauth-callback-state is-error" role="alert">
        <p>{error}</p>
        <Link href="/signin">로그인 페이지로 돌아가기</Link>
      </div>
    );
  }

  return <div className="oauth-callback-state"><span className="loading-spinner" /> Google 로그인을 완료하고 있습니다.</div>;
}
