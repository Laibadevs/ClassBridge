'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import { BridgeIcon, MailIcon, ArrowLeftIcon, CheckCircleIcon } from '@/components/icons';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // Backend always returns the same neutral message, whether or not the
      // email exists, so this form can't be used to check who has an account.
      await api.post('/api/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'You appear to be offline. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface px-4 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-ring"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Back to login
        </Link>
        <Link href="/" className="flex items-center gap-2 rounded-lg focus-ring">
          <BridgeIcon className="h-6 w-6 text-brand-blue" aria-hidden />
          <span className="font-bold tracking-tight text-ink">ClassBridge AI</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-premium sm:p-9">
          {sent ? (
            <div className="py-4 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-brand-greenDark">
                <CheckCircleIcon className="h-7 w-7" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-ink">Check your email</h1>
              <p className="mt-2 text-ink-muted">
                If an account exists for this email, we&apos;ll send instructions to reset your
                password.
              </p>
              <Button href="/login" size="lg" variant="primary" className="mt-6 w-full rounded-full">
                Back to login
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-ink">Reset your password</h1>
              <p className="mt-2 text-ink-muted">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

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
                  {submitting ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
