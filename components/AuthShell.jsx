'use client';

import { usePathname } from 'next/navigation';
import Logo from './Logo';

export default function AuthShell({ children }) {
  const pathname = usePathname();
  const pageVariant = pathname === '/signup' ? 'signup' : 'signin';

  return (
    <main className={`auth-page auth-page--${pageVariant}`}>
      <div className="auth-container">
        <Logo variant="auth" />
        <div className="auth-body">{children}</div>
      </div>
    </main>
  );
}
