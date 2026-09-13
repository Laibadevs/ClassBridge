'use client';

/**
 * Thin fetch wrapper for the FastAPI backend. Every call sends
 * `credentials: 'include'` so the httpOnly session cookie rides along, and
 * attaches the CSRF header (double-submit pattern) on state-changing verbs.
 *
 * Requests go to a relative /api/... path — same origin as this frontend —
 * rather than the backend's own absolute URL. next.config.mjs proxies those
 * paths to the real backend server-side. This matters once frontend and
 * backend are deployed to separate hosts: a cookie the backend sets is only
 * ever readable/sendable on the domain the browser thinks it talked to, so
 * calling the backend directly from the browser would mean login "succeeds"
 * but the resulting session cookie is scoped to a domain this app's own
 * server-side auth check (middleware.ts) never sees. Proxying keeps every
 * request same-origin from the browser's perspective, so the cookie ends up
 * scoped to this frontend's own domain instead.
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (init.body) headers.set('Content-Type', 'application/json');
  if (method !== 'GET') {
    const csrfToken = readCookie('cb_csrf');
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }

  let res: Response;
  try {
    // Every response here is personalized/ownership-scoped data — never
    // safe for the browser's HTTP cache to reuse across calls to the same
    // URL (e.g. GET /api/teacher/students right after a POST that changed
    // it). middleware.ts already does the same for /api/auth/me.
    res = await fetch(path, { ...init, method, headers, credentials: 'include', cache: 'no-store' });
  } catch {
    throw new ApiError('You appear to be offline. Please check your connection and try again.', 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.detail === 'string' ? data.detail : 'Something went wrong. Please try again.';
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/**
 * Logout goes to this Next.js server (same origin) instead of straight to
 * FastAPI like every other call here. middleware.ts intercepts this exact
 * path so it can drop this cookie's cached auth verdict in the same
 * process/module instance that cache lives in, then forwards the real
 * revocation to FastAPI itself — see middleware.ts's handleLogout for why
 * that has to happen server-side rather than via a second fetch from here.
 */
export async function logout(): Promise<{ message: string }> {
  const headers = new Headers();
  const csrfToken = readCookie('cb_csrf');
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken);

  let res: Response;
  try {
    res = await fetch('/api/auth/logout', { method: 'POST', headers, credentials: 'include' });
  } catch {
    throw new ApiError('You appear to be offline. Please check your connection and try again.', 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : typeof data?.message === 'string'
          ? data.message
          : 'Something went wrong. Please try again.';
    throw new ApiError(message, res.status);
  }
  return data;
}
