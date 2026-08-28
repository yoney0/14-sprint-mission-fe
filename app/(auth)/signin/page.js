import LoginForm from '@/components/LoginForm';

export const metadata = { title: '로그인' };

export default async function SignInPage({ searchParams }) {
  const { next = '' } = (await searchParams) || {};
  return <LoginForm next={Array.isArray(next) ? next[0] : next} />;
}
