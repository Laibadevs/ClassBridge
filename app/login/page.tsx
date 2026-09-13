'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  BridgeIcon,
  LecternIcon,
  UsersIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  SparklesIcon,
} from '@/components/icons';

type Role = 'teacher' | 'parent';

const demoAccounts: Record<Role, { email: string; password: string }> = {
  teacher: { email: 'sarah.teacher@classbridge.ai', password: 'demo1234' },
  parent: { email: 'parent.ali@classbridge.ai', password: 'demo1234' },
};

const roleOptions: { id: Role; label: string; icon: typeof LecternIcon }[] = [
  { id: 'teacher', label: 'Teacher', icon: LecternIcon },
  { id: 'parent', label: 'Parent', icon: UsersIcon },
];

const highlights = [
  'Attendance, grades and notes in one place',
  'Bilingual updates in Simple English + Roman Urdu',
  'One clear, practical action for every parent',
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const [role, setRole] = useState<Role>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password to continue.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn(email.trim(), password, role);
      if (result.ok && result.role) {
        // Hard navigation (not router.push): guarantees a fully fresh
        // server render of the dashboard for the just-established session,
        // rather than depending on the client router's cache/transition
        // state correctly picking up cookies that only just got set.
        window.location.assign(result.role === 'teacher' ? '/teacher' : '/parent');
        return;
      }
      setError(result.error ?? 'Something went wrong signing you in. Please try again.');
    } catch {
      setError('You appear to be offline. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo() {
    const account = demoAccounts[role];
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-blueDark via-brand-blue to-brand-green p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden />

        <Link href="/" className="relative flex items-center gap-2.5 rounded-lg focus-ring self-start">
          <BridgeIcon className="h-8 w-8 text-white" aria-hidden />
          <span className="text-xl font-bold tracking-tight">ClassBridge AI</span>
        </Link>

        <div className="relative mt-auto max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight">
            Turn classroom data into parent understanding.
          </h2>
          <p className="mt-4 text-lg text-blue-50/90">
            Sign in to see how ClassBridge AI turns attendance, grades and teacher notes into
            simple, empathetic updates.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-blue-50/95">
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-200" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-auto flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <SparklesIcon className="h-5 w-5 text-white" />
          </span>
          <p className="text-sm text-blue-50/90">
            <span className="font-semibold text-white">1,200+ parent updates</span> generated in
            this demo so far.
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="glow-field flex flex-col bg-surface px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-ring"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Back to home
          </Link>
          <Link href="/" className="flex items-center gap-2 rounded-lg focus-ring lg:invisible">
            <BridgeIcon className="h-6 w-6 text-brand-blue" aria-hidden />
            <span className="font-bold tracking-tight text-ink">ClassBridge AI</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-premium sm:p-9">
            <h1 className="text-3xl font-bold tracking-tight text-ink">Welcome back</h1>
            <p className="mt-2 text-ink-muted">Choose your role and continue to the demo.</p>

            {/* Role toggle */}
            <div
              className="mt-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5"
              role="group"
              aria-label="Select role"
            >
              {roleOptions.map(({ id, label, icon: Icon }) => {
                const active = role === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRole(id)}
                    aria-pressed={active}
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-ring ${
                      active
                        ? id === 'teacher'
                          ? 'bg-white text-brand-blue shadow-elevated'
                          : 'bg-white text-brand-greenDark shadow-elevated'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                  Email
                </label>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu"
                    aria-invalid={!!error}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-ink">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-brand-blue transition-colors hover:text-brand-blueDark focus-ring rounded"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    aria-invalid={!!error}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-ring"
                  >
                    {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-ink-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={fillDemo}
                  className="font-semibold text-brand-blue transition-colors hover:text-brand-blueDark focus-ring rounded"
                >
                  Use demo credentials
                </button>
              </div>

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                variant={role === 'teacher' ? 'primary' : 'secondary'}
                className="w-full rounded-full"
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? 'Signing in…' : `Continue as ${role === 'teacher' ? 'Teacher' : 'Parent'}`}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-muted">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-brand-blue hover:text-brand-blueDark">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
