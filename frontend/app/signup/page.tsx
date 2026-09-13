'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  BridgeIcon,
  LecternIcon,
  UsersIcon,
  UserIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  SparklesIcon,
} from '@/components/icons';

type Role = 'teacher' | 'parent';

const roleOptions: { id: Role; label: string; icon: typeof LecternIcon }[] = [
  { id: 'teacher', label: 'Teacher', icon: LecternIcon },
  { id: 'parent', label: 'Parent', icon: UsersIcon },
];

const highlights = [
  'Attendance, grades and notes in one place',
  'Bilingual updates in Simple English + Roman Urdu',
  'One clear, practical action for every parent',
];

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const { signUp } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'created' | 'needs-confirmation'>('idle');

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!fullName.trim()) errors.fullName = 'Please enter your full name.';
    if (!email.trim()) errors.email = 'Please enter your email.';
    else if (!EMAIL_RE.test(email.trim())) errors.email = 'Please enter a valid email address.';
    if (!password) errors.password = 'Please create a password.';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
    else if (confirmPassword !== password) errors.confirmPassword = 'Passwords don’t match.';
    if (!role) errors.role = 'Please select whether you’re a teacher or a parent.';
    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !role) return;

    setSubmitting(true);
    try {
      const result = await signUp({ fullName: fullName.trim(), email: email.trim(), password, role });
      if (!result.ok) {
        setFormError(result.error ?? 'Something went wrong creating your account. Please try again.');
        return;
      }
      if (result.requiresEmailConfirmation) {
        setStatus('needs-confirmation');
        return;
      }
      setStatus('created');
      // Hard navigation (not router.push): guarantees a fully fresh server
      // render of the dashboard for the just-established session.
      window.location.assign(result.role === 'teacher' ? '/teacher' : '/parent');
    } catch {
      setFormError('You appear to be offline. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
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
            Create your account to start turning attendance, grades and teacher notes into
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
            {status === 'needs-confirmation' ? (
              <div className="py-4 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-brand-greenDark">
                  <MailIcon className="h-7 w-7" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-ink">Check your email</h1>
                <p className="mt-2 text-ink-muted">
                  We sent a verification link to <span className="font-semibold text-ink">{email}</span>.
                  Check your email to verify your account, then come back and log in.
                </p>
                <Button href="/login" size="lg" variant="primary" className="mt-6 w-full rounded-full">
                  Go to login
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight text-ink">Create your account</h1>
                <p className="mt-2 text-ink-muted">Join ClassBridge AI as a teacher or a parent.</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                  <div>
                    <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-ink">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
                      <input
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Sarah Ahmed"
                        aria-invalid={!!fieldErrors.fullName}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                      />
                    </div>
                    {fieldErrors.fullName && (
                      <p className="mt-1.5 text-sm text-red-600">{fieldErrors.fullName}</p>
                    )}
                  </div>

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
                        aria-invalid={!!fieldErrors.email}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                      />
                    </div>
                    {fieldErrors.email && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                      Password
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
                        aria-invalid={!!fieldErrors.password}
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
                    {fieldErrors.password && (
                      <p className="mt-1.5 text-sm text-red-600">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-ink">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        aria-invalid={!!fieldErrors.confirmPassword}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                      />
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1.5 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-1.5 block text-sm font-medium text-ink">I am a...</p>
                    <div
                      className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5"
                      role="group"
                      aria-label="Select role"
                    >
                      {roleOptions.map(({ id, label, icon: Icon }) => {
                        const active = role === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setRole(id);
                              setFieldErrors((prev) => ({ ...prev, role: undefined }));
                            }}
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
                    {fieldErrors.role && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.role}</p>}
                  </div>

                  {formError && (
                    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                      {formError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    variant={role === 'parent' ? 'secondary' : 'primary'}
                    className="w-full rounded-full"
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {submitting ? 'Creating account…' : 'Create Account'}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-ink-muted">
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold text-brand-blue hover:text-brand-blueDark">
                    Log in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
