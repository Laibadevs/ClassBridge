'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { api, ApiError, logout as logoutRequest } from '@/lib/api';
import type { Role } from '@/lib/types';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface SignInResult {
  ok: boolean;
  role?: Role;
  error?: string;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  role: Role;
}

export interface SignUpResult {
  ok: boolean;
  requiresEmailConfirmation?: boolean;
  role?: Role;
  error?: string;
}

interface AuthContextValue {
  user: Profile | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string, expectedRole: Role) => Promise<SignInResult>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * cb_csrf is the one auth cookie that isn't httpOnly (double-submit CSRF
 * pattern), so its presence is a reliable, JS-readable signal that a session
 * cookie was also issued. Checking it first lets anonymous visitors on public
 * pages (the landing page, most visibly) skip the /api/auth/me round trip
 * entirely, instead of firing it on every mount and having the browser log a
 * 401 to the console for every signed-out visitor.
 */
function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c.startsWith('cb_csrf='));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!hasSessionCookie()) {
      setProfile(null);
      return;
    }
    try {
      const me = await api.get<Profile>('/api/auth/me');
      setProfile(me);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!hasSessionCookie()) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const me = await api.get<Profile>('/api/auth/me');
        if (active) setProfile(me);
      } catch {
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function signIn(email: string, password: string, expectedRole: Role): Promise<SignInResult> {
    try {
      const me = await api.post<Profile>('/api/auth/login', { email, password, role: expectedRole });
      setProfile(me);
      return { ok: true, role: me.role };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      return { ok: false, error: message };
    }
  }

  async function signUp({ fullName, email, password, role }: SignUpInput): Promise<SignUpResult> {
    try {
      const me = await api.post<Profile>('/api/auth/signup', {
        full_name: fullName,
        email,
        password,
        role,
      });
      // No email-confirmation step in this backend yet — signup logs the
      // user in immediately. requiresEmailConfirmation is kept in the return
      // shape so this can flip on later without touching the signup page.
      setProfile(me);
      return { ok: true, requiresEmailConfirmation: false, role: me.role };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      return { ok: false, error: message };
    }
  }

  async function signOut() {
    try {
      await logoutRequest();
    } catch {
      // Even if the network call fails, drop client-side state — the
      // middleware/backend will still reject the stale cookie on next use.
    }
    setProfile(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user: profile,
      profile,
      role: profile?.role ?? null,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>.');
  return ctx;
}
