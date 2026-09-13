'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { GraduationCapIcon, MenuIcon, CloseIcon, LogOutIcon } from './icons';

interface NavigationProps {
  variant?: 'marketing' | 'app';
}

const appLinks = [
  { href: '/teacher', label: 'Teacher view', role: 'teacher' as const },
  { href: '/parent', label: 'Parent view', role: 'parent' as const },
];

export default function Navigation({ variant = 'marketing' }: NavigationProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { role, signOut } = useAuth();
  const visibleAppLinks = appLinks.filter((link) => link.role === role);

  async function handleLogout() {
    setOpen(false);
    await signOut();
    // Hard navigation: guarantees a fresh, fully logged-out render rather
    // than depending on the client router picking up the cleared cookie.
    window.location.assign('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 focus-ring rounded-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue text-white">
            <GraduationCapIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">
            ClassBridge <span className="text-brand-blue">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {variant === 'marketing' ? (
            <>
              <a href="#how-it-works" className="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink focus-ring">
                How it works
              </a>
              <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink focus-ring">
                Log in
              </Link>
              <Link
                href="/login"
                className="ml-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-blueDark focus-ring"
              >
                Try ClassBridge
              </Link>
            </>
          ) : (
            <>
              {visibleAppLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-ring ${
                    pathname?.startsWith(link.href)
                      ? 'bg-blue-50 text-brand-blue'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink focus-ring"
              >
                <LogOutIcon className="h-4 w-4" /> Log out
              </button>
            </>
          )}
        </nav>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink md:hidden focus-ring"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {variant === 'marketing' ? (
              <>
                <a
                  href="#how-it-works"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  How it works
                </a>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/login"
                  className="mt-1 rounded-xl bg-brand-blue px-3 py-2.5 text-center text-sm font-semibold text-white"
                  onClick={() => setOpen(false)}
                >
                  Try ClassBridge
                </Link>
              </>
            ) : (
              <>
                {visibleAppLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                      pathname?.startsWith(link.href)
                        ? 'bg-blue-50 text-brand-blue'
                        : 'text-ink-muted hover:bg-slate-50'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink-muted hover:bg-slate-50"
                >
                  <LogOutIcon className="h-4 w-4" /> Log out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
