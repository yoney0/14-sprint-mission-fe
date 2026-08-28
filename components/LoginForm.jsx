'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import FormField from './FormField';
import MessageModal from './MessageModal';
import PasswordField from './PasswordField';
import useRedirectAuthenticated from '@/hooks/useRedirectAuthenticated';
import { API_BASE_URL, getApiErrorMessage } from '@/lib/api-client';
import { getSafeNextPath, saveAuthNextPath, saveAuthTokens } from '@/lib/auth-storage';
import { authApi } from '@/lib/panda-api';
import { invalidateViewerScopedQueries, queryKeys } from '@/lib/query-keys';

const EMAIL_ERROR = '이메일을 확인해 주세요.';
const PASSWORD_ERROR = '비밀번호를 확인해 주세요.';

export default function LoginForm({ next = '' }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const nextPath = getSafeNextPath(next);
  const checkingAuth = useRedirectAuthenticated(nextPath);
  const [modalMessage, setModalMessage] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm({ mode: 'onChange', defaultValues: { email: '', password: '' } });
  const signInMutation = useMutation({
    mutationFn: authApi.signIn,
    onSuccess(data) {
      saveAuthTokens(data);
      queryClient.setQueryData(queryKeys.user, data.user);
      invalidateViewerScopedQueries(queryClient);
      router.replace(nextPath);
    },
    onError(error) {
      setError('email', { type: 'server', message: EMAIL_ERROR });
      setError('password', { type: 'server', message: PASSWORD_ERROR });
      setModalMessage(getApiErrorMessage(error, '로그인에 실패했습니다.'));
    },
  });

  if (checkingAuth) return <p className="auth-status">로그인 상태를 확인하고 있습니다.</p>;

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit((values) => signInMutation.mutate(values))} noValidate>
        <FormField id="email" label="이메일" error={errors.email?.message}>
          <input
            id="email"
            className={`input-field ${errors.email ? 'input-field-error' : ''}`}
            type="email"
            placeholder="이메일을 입력해주세요"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register('email', {
              required: EMAIL_ERROR,
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: EMAIL_ERROR },
            })}
          />
        </FormField>

        <FormField id="password" label="비밀번호" error={errors.password?.message}>
          <PasswordField
            id="password"
            placeholder="비밀번호를 입력해주세요"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            hasError={Boolean(errors.password)}
            {...register('password', {
              required: PASSWORD_ERROR,
              minLength: { value: 8, message: PASSWORD_ERROR },
            })}
          />
        </FormField>

        <button className="primary-button w-full" type="submit" disabled={!isValid || signInMutation.isPending}>
          {signInMutation.isPending ? '로그인 중' : '로그인'}
        </button>
      </form>

      <section className="mt-6 flex items-center justify-between rounded-lg bg-primary-50 px-6 py-4">
        <p className="font-medium text-gray-800">간편 로그인</p>
        <div className="flex gap-4">
          <a
            href={`${API_BASE_URL}/auth/google?next=${encodeURIComponent('/oauth/callback')}`}
            aria-label="Google로 로그인"
            onClick={() => saveAuthNextPath(nextPath)}
          >
            <Image className="h-11 w-11" src="/images/Component%202%403x.png" width={43} height={43} alt="" unoptimized />
          </a>
        </div>
      </section>

      <p className="mt-6 text-center text-sm font-medium text-gray-800">
        판다마켓이 처음이신가요? <Link className="text-primary underline" href={`/signup?next=${encodeURIComponent(nextPath)}`}>회원 가입하기</Link>
      </p>

      <MessageModal message={modalMessage} onClose={() => setModalMessage('')} />
    </>
  );
}
