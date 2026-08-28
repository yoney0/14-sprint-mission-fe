import SignupForm from '@/components/SignupForm';

export const metadata = { title: '회원가입' };

export default async function SignupPage({ searchParams }) {
  const { next = '' } = (await searchParams) || {};
  return <SignupForm next={Array.isArray(next) ? next[0] : next} />;
}
