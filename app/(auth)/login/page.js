import { redirect } from 'next/navigation';

export default async function LoginPage({ searchParams }) {
  const { next = '' } = (await searchParams) || {};
  const nextPath = Array.isArray(next) ? next[0] : next;
  redirect(nextPath ? `/signin?next=${encodeURIComponent(nextPath)}` : '/signin');
}
