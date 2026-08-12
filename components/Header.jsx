'use client';

import { LogIn, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import SafeImage from './SafeImage';
import useCurrentUser from '@/hooks/useCurrentUser';

const navLinks = [
  { href: '/free-board', label: '자유게시판' },
  { href: '/items', label: '중고마켓' },
];

export default function Header() {
  const pathname = usePathname();
  const { data: user, isAuthenticated, isCheckingAuth } = useCurrentUser();

  return (
    <header className="market-header">
      <div className="market-header__inner">
        <nav className="market-header__left" aria-label="주요 메뉴">
          <Logo pathname={pathname} />
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                className={`market-nav-link ${isActive ? 'is-active' : ''}`}
                href={href}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        {isAuthenticated && user ? (
          <div className="market-profile" aria-label={`${user.nickname} 프로필`}>
            {user.image ? (
              <SafeImage src={user.image} fallback="/images/판다 얼굴.png" alt="" />
            ) : (
              <span className="market-profile__fallback"><UserRound size={18} aria-hidden="true" /></span>
            )}
            <span>{user.nickname}</span>
          </div>
        ) : isCheckingAuth ? (
          <span className="market-profile-loading" aria-label="로그인 상태 확인 중" />
        ) : (
          <Link className="market-login" href="/signin"><LogIn size={18} aria-hidden="true" /> 로그인</Link>
        )}
      </div>
    </header>
  );
}
