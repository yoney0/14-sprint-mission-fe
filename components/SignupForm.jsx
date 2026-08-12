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
import { getApiErrorMessage } from '@/lib/api-client';
import { saveAuthTokens } from '@/lib/auth-storage';
import { authApi } from '@/lib/panda-api';
import { queryKeys } from '@/lib/query-keys';

const PASSWORD_PATTERN = /^([a-z]|[A-Z]|[0-9]|[!@#$%^&*])+$/;

export default function SignupForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const checkingAuth = useRedirectAuthenticated();
  const [modalMessage, setModalMessage] = useState('');
  const {
    register,
    getValues,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    mode: 'onChange',
    defaultValues: { email: '', nickname: '', password: '', passwordConfirmation: '' },
  });
  const signUpMutation = useMutation({
    mutationFn: authApi.signUp,
    onSuccess(data) {
      saveAuthTokens(data);
      queryClient.setQueryData(queryKeys.user, data.user);
      router.replace('/items');
    },
    onError(error) {
      setModalMessage(getApiErrorMessage(error, '회원가입에 실패했습니다.'));
    },
  });

  if (checkingAuth) return <p className="auth-status">로그인 상태를 확인하고 있습니다.</p>;

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit((values) => signUpMutation.mutate(values))} noValidate>
        <FormField id="email" label="이메일" error={errors.email?.message}>
          <input
            id="email"
            className={`input-field ${errors.email ? 'input-field-error' : ''}`}
            type="email"
            placeholder="이메일을 입력하세요"
            autoComplete="email"
            {...register('email', {
              required: '이메일을 입력해 주세요.',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '이메일 형식을 확인해 주세요.' },
            })}
          />
        </FormField>

        <FormField id="nickname" label="닉네임" error={errors.nickname?.message}>
          <input
            id="nickname"
            className={`input-field ${errors.nickname ? 'input-field-error' : ''}`}
            type="text"
            placeholder="닉네임을 입력해주세요"
            autoComplete="nickname"
            {...register('nickname', {
              required: '닉네임을 입력해 주세요.',
              maxLength: { value: 20, message: '닉네임은 20자 이하로 입력해 주세요.' },
            })}
          />
        </FormField>

        <FormField id="password" label="비밀번호" error={errors.password?.message}>
          <PasswordField
            id="password"
            placeholder="비밀번호를 입력해주세요"
            autoComplete="new-password"
            hasError={Boolean(errors.password)}
            {...register('password', {
              required: '비밀번호를 입력해 주세요.',
              minLength: { value: 8, message: '비밀번호는 8자 이상 입력해 주세요.' },
              pattern: { value: PASSWORD_PATTERN, message: '영문, 숫자, !@#$%^&*만 사용할 수 있어요.' },
            })}
          />
        </FormField>

        <FormField id="passwordConfirmation" label="비밀번호 확인" error={errors.passwordConfirmation?.message}>
          <PasswordField
            id="passwordConfirmation"
            placeholder="비밀번호를 다시 한번 입력해주세요"
            autoComplete="new-password"
            hasError={Boolean(errors.passwordConfirmation)}
            {...register('passwordConfirmation', {
              required: '비밀번호를 다시 입력해 주세요.',
              validate: (value) => value === getValues('password') || '비밀번호가 일치하지 않아요.',
              deps: ['password'],
            })}
          />
        </FormField>

        <button className="primary-button w-full" type="submit" disabled={!isValid || signUpMutation.isPending}>
          {signUpMutation.isPending ? '회원가입 중' : '회원가입'}
        </button>
      </form>

      <section className="mt-6 flex items-center justify-between rounded-lg bg-primary-50 px-6 py-4">
        <p className="font-medium text-gray-800">간편 회원가입</p>
        <div className="flex gap-4">
          <a href="https://www.google.com/" target="_blank" rel="noreferrer" aria-label="Google">
            <Image className="h-11 w-11" src="/images/Component%202%403x.png" width={43} height={43} alt="" unoptimized />
          </a>
          <a href="https://www.kakaocorp.com/page" target="_blank" rel="noreferrer" aria-label="Kakao">
            <Image className="h-11 w-11" src="/images/Component%203%403x.png" width={42} height={42} alt="" unoptimized />
          </a>
        </div>
      </section>

      <p className="mt-6 text-center text-sm font-medium text-gray-800">
        이미 회원이신가요? <Link className="text-primary underline" href="/signin">로그인</Link>
      </p>

      <MessageModal message={modalMessage} onClose={() => setModalMessage('')} />
    </>
  );
}
