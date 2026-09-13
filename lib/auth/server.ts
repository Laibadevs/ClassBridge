// Server-side auth helpers for Server Components / Route Handlers.
// The Next.js server has no direct database access — it forwards the
// incoming session cookie to the FastAPI backend and trusts its answer.

import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role } from '@/lib/types';
import { TRUSTED_USER_HEADER, decodeTrustedUser } from '@/lib/auth/trusted-header';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

function serializeCookies(): string {
  return cookies()
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

async function fetchSessionUser(): Promise<AuthedUser | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { cookie: serializeCookies() },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Profiles always render a name/initials, so never hand back null or "".
    const email = typeof data.email === 'string' ? data.email : '';
    return {
      id: data.id,
      email,
      name: data.full_name || email.split('@')[0] || 'Member',
      role: data.role,
    };
  } catch {
    return null;
  }
}

/**
 * middleware.ts already verifies the session against the backend for every
 * request to a protected/auth route and forwards the result via a request
 * header only it sets (see lib/auth/trusted-header.ts) — reusing that here
 * avoids asking FastAPI "/api/auth/me" a second time for the same request.
 * Any route middleware doesn't cover (its matcher is /teacher, /parent,
 * /login, /signup only) falls back to asking the backend directly, so this
 * stays correct even if that coverage ever changes.
 */
export async function getSessionUser(): Promise<AuthedUser | null> {
  const fromMiddleware = decodeTrustedUser(headers().get(TRUSTED_USER_HEADER));
  if (fromMiddleware) return fromMiddleware;
  return fetchSessionUser();
}

/** Returns the authenticated user for `role`, or redirects to /login / their own dashboard. */
export async function requireRole(role: Role): Promise<AuthedUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== role) {
    redirect(dashboardFor(user.role));
  }
  return user;
}

export function dashboardFor(role: Role): string {
  return role === 'teacher' ? '/teacher' : '/parent';
}
