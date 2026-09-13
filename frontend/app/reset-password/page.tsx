'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import { BridgeIcon, LockIcon, EyeIcon, EyeOffIcon, CheckCircleIcon } from '@/components/icons';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don’t match.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'You appear to be offline. Please check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="py-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Invalid reset link</h1>
        <p className="mt-2 text-ink-muted">
          This link is missing its reset token. Please request a new one.
        </p>
        <Button href="/forgot-password" size="lg" variant="primary" className="mt-6 w-full rounded-full">
          Request a new link
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="py-4 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-brand-greenDark">
          <CheckCircleIcon className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Password updated</h1>
        <p className="mt-2 text-ink-muted">Taking you to login…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-ink">Choose a new password</h1>
      <p className="mt-2 text-ink-muted">Enter and confirm your new password below.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
            New Password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
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

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-ink">
            Confirm New Password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          variant="primary"
          className="w-full rounded-full"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface px-4 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 rounded-lg focus-ring">
          <BridgeIcon className="h-6 w-6 text-brand-blue" aria-hidden />
          <span className="font-bold tracking-tight text-ink">ClassBridge AI</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-premium sm:p-9">
          <Suspense fallback={<p className="text-center text-ink-muted">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
