'use client';

import { useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { BridgeIcon, SearchIcon, MenuIcon, LogOutIcon, CloseIcon } from '@/components/icons';

export interface AppNavItem {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Omit for sections that aren't wired up yet — renders as an inert item. */
  href?: string;
}

interface AppShellProps {
  userName: string;
  roleLabel: string;
  navItems: AppNavItem[];
  bottomItems?: AppNavItem[];
  /** Replaces the desktop search field (used by the parent greeting). */
  headerLead?: ReactNode;
  searchPlaceholder?: string;
  children: ReactNode;
}

const AVATAR_GRADIENT = 'bg-gradient-to-br from-brand-blue to-brand-green';

function initialsOf(name: string) {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** A nav entry is active only for its own route (exact for a section root). */
function itemActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href === '/teacher' || href === '/parent') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The single application chrome shared by every signed-in screen — teacher and
 * parent alike. Both roles render identical spacing, typography and colour
 * tokens, so product surfaces can never drift apart visually.
 */
export default function AppShell({
  userName,
  roleLabel,
  navItems,
  bottomItems = [],
  headerLead,
  searchPlaceholder,
  children,
}: AppShellProps) {
  const { signOut } = useAuth();
  const pathname = usePathname() ?? '';
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const initials = initialsOf(userName);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      // Hard navigation: guarantees a fresh, fully logged-out render rather
      // than depending on the client router picking up the cleared cookie.
      window.location.assign('/login');
    }
  }

  const panel = (
    <div className="flex h-full w-72 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-ring">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-blueDark text-white shadow-elevated">
            <BridgeIcon className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-[1.05rem] font-bold tracking-tight text-ink">
            ClassBridge <span className="text-brand-blue">AI</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-2">
        <p className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Menu</p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = itemActive(pathname, item.href);
            const classes = `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all focus-ring ${
              isActive
                ? 'bg-brand-blue text-white shadow-elevated'
                : 'text-ink-muted hover:bg-slate-50 hover:text-ink'
            }`;
            const content = (
              <>
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-ink-muted group-hover:text-ink'}`} />
                {item.label}
              </>
            );
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={classes}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {content}
                  </Link>
                ) : (
                  <button type="button" className={`${classes} w-full text-left`} title={`${item.label} — coming soon`}>
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="space-y-1 border-t border-slate-200 px-4 py-4">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return item.href ? (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-slate-50 hover:text-ink focus-ring"
              onClick={() => setMenuOpen(false)}
            >
              <Icon className="h-5 w-5" /> {item.label}
            </Link>
          ) : (
            <button
              key={item.id}
              type="button"
              title={`${item.label} — coming soon`}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-slate-50 hover:text-ink focus-ring"
            >
              <Icon className="h-5 w-5" /> {item.label}
            </button>
          );
        })}

        <div className="mt-1 flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-brand-blue">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{userName}</p>
            <p className="truncate text-xs text-ink-muted">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            aria-label="Log out"
            title="Log out"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-red-50 hover:text-brand-blueDark focus-ring disabled:opacity-50"
          >
            <LogOutIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:shrink-0">{panel}</aside>

      {/* min-w-0 keeps this flex column from being propped open by a wide child
          (e.g. a horizontally scrollable filter strip), which would otherwise
          make the whole page scroll sideways on mobile. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink transition-colors hover:bg-slate-100 focus-ring lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          {headerLead ? (
            <div className="min-w-0 flex-1">{headerLead}</div>
          ) : (
            <>
              <div className="relative hidden max-w-sm flex-1 sm:block">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  type="search"
                  placeholder={searchPlaceholder}
                  aria-label="Search"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/25"
                />
              </div>
            </>
          )}

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {searchPlaceholder && (
              <button
                type="button"
                aria-label="Search"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-ring sm:hidden"
              >
                <SearchIcon className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-ring"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-green ring-2 ring-white" />
            </button>
            <div className="ml-1 flex items-center gap-2.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1 sm:pr-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${AVATAR_GRADIENT}`}
              >
                {initials}
              </span>
              <span className="hidden text-sm font-semibold text-ink sm:block">{userName}</span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>

      {/* Mobile drawer */}
      <div className={`lg:hidden ${menuOpen ? '' : 'pointer-events-none'}`} aria-hidden={!menuOpen}>
        <div
          className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-200 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-slate-100 focus-ring"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          {panel}
        </div>
      </div>
    </div>
  );
}
