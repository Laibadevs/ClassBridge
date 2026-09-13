'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BridgeIcon, MenuIcon, CloseIcon } from '@/components/icons';

const navLinks = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#for-teachers', label: 'For Teachers' },
  { href: '#for-parents', label: 'For Parents' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="glass sticky top-0 z-40">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-ring">
          <BridgeIcon className="h-7 w-7 text-brand-blue" aria-hidden />
          <span className="text-lg font-bold tracking-tight text-ink">ClassBridge AI</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-ink/80 transition-colors hover:text-ink focus-ring rounded"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <Link
            href="/login"
            className="text-[15px] font-semibold text-ink/80 transition-colors hover:text-ink focus-ring rounded"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-brand-blue px-5 py-2.5 text-[15px] font-semibold text-white shadow-glowBlue transition-all duration-200 hover:bg-brand-blueDark hover:shadow-premium focus-ring"
          >
            Try ClassBridge
          </Link>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink focus-ring lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="mt-1 rounded-full bg-brand-blue px-3 py-2.5 text-center text-[15px] font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Try ClassBridge
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
