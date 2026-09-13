import { NextResponse, type NextRequest } from 'next/server';
import type { Role } from '@/lib/types';
import { TRUSTED_USER_HEADER, encodeTrustedUser, type TrustedUser } from '@/lib/auth/trusted-header';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function dashboardFor(role: Role): string {
  return role === 'teacher' ? '/teacher' : '/parent';
}

/**
 * The backend call this makes is a real network round trip to a remote
 * database — profiling showed it dominates every single navigation (1-3s,
 * occasionally much worse under database cold-start), even though the
 * middleware/render code around it costs 0-3ms. There is no further
 * duplicate work to remove there: it's already exactly one call per request.
 * A short in-memory cache, keyed by the exact incoming cookie, turns a burst
 * of clicks through the dashboard (the common case) into one backend round
 * trip instead of one per click. The backend remains the sole source of
 * truth for every *distinct* cookie value or cache miss; this only skips
 * re-asking it the identical question for the identical cookie within a
 * few seconds, which bounds how quickly a revoked session stops working to
 * "at most this TTL" instead of "instantly" — an explicit, deliberate
 * trade-off for demo responsiveness, not a security bypass: a forged or
 * absent cookie is never in this cache and always gets a real check.
 */
const AUTH_CACHE_TTL_MS = 5000;
const authCache = new Map<string, { user: TrustedUser | null; expiresAt: number }>();

function getCachedAuthUser(cookieHeader: string): TrustedUser | null | undefined {
  const entry = authCache.get(cookieHeader);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    authCache.delete(cookieHeader);
    return undefined;
  }
  return entry.user;
}

function setCachedAuthUser(cookieHeader: string, user: TrustedUser | null) {
  // Bound the map so a long-running process doesn't accumulate stale cookie
  // strings forever — this is a demo-scale safeguard, not an LRU.
  if (authCache.size > 500) authCache.clear();
  authCache.set(cookieHeader, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
}

const LOGOUT_PATH = '/api/auth/logout';

/**
 * Logout used to be a browser -> FastAPI call that never touched this
 * server at all, so nothing here ever learned a session had been revoked —
 * the cache entry for that cookie just sat there, valid, until its TTL
 * expired on its own. That gave a stolen/replayed cookie up to
 * AUTH_CACHE_TTL_MS of extra life *after* the legitimate user had already
 * logged out.
 *
 * Fix: the frontend now posts logout to this same-origin path instead, so
 * it's this exact middleware invocation — same module, same `authCache`
 * instance, no cross-runtime sharing to verify or hope for — that drops the
 * cache entry. FastAPI is still the one actually revoking the session; this
 * only makes sure *this* process stops vouching for that cookie the moment
 * revocation is confirmed, instead of up to 5 seconds later.
 */
async function handleLogout(request: NextRequest): Promise<NextResponse> {
  const cookieHeader = request.headers.get('cookie');

  // Defense in depth: drop the cached verdict before we even ask the
  // backend to revoke, so a concurrent request landing mid-request can't
  // extend a stale "authenticated" hit past this point.
  if (cookieHeader) authCache.delete(cookieHeader);

  let status = 200;
  let bodyText = JSON.stringify({ message: 'Logged out.' });
  try {
    const backendRes = await fetch(`${API_URL}${LOGOUT_PATH}`, {
      method: 'POST',
      headers: {
        cookie: cookieHeader ?? '',
        'x-csrf-token': request.headers.get('x-csrf-token') ?? '',
      },
    });
    status = backendRes.status;
    bodyText = await backendRes.text();
  } catch {
    // Backend unreachable: we can't confirm server-side revocation, so
    // report failure rather than telling the browser it's safely logged
    // out. The cache entry is already gone either way (above), so this
    // process won't keep vouching for the cookie regardless.
    status = 503;
    bodyText = JSON.stringify({ message: 'Could not reach the server. Please try again.' });
  }

  // Belt-and-suspenders: drop it again now that revocation is confirmed,
  // closing the narrow (network-latency-sized, not artificial-TTL-sized)
  // window where a request in flight during the backend call could have
  // re-cached a still-valid verdict.
  if (cookieHeader) authCache.delete(cookieHeader);

  const res = new NextResponse(bodyText, { status, headers: { 'content-type': 'application/json' } });
  if (status < 300) {
    res.cookies.set('cb_session', '', { path: '/', maxAge: 0 });
    res.cookies.set('cb_csrf', '', { path: '/', maxAge: 0 });
  }
  return res;
}

async function fetchAuthUser(request: NextRequest): Promise<TrustedUser | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cached = getCachedAuthUser(cookieHeader);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    if (!res.ok) {
      // A real "not authenticated" answer is safe to cache too — it's still
      // an actual verified result, just a negative one.
      setCachedAuthUser(cookieHeader, null);
      return null;
    }
    const data = await res.json();
    if (data?.role !== 'teacher' && data?.role !== 'parent') {
      setCachedAuthUser(cookieHeader, null);
      return null;
    }
    const email = typeof data.email === 'string' ? data.email : '';
    const user: TrustedUser = {
      id: String(data.id ?? ''),
      email,
      name: data.full_name || email.split('@')[0] || 'Member',
      role: data.role,
    };
    setCachedAuthUser(cookieHeader, user);
    return user;
  } catch {
    // Network failure: don't cache it, so a transient backend hiccup
    // doesn't lock a legitimate user out for the TTL window.
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === LOGOUT_PATH && request.method === 'POST') {
    return handleLogout(request);
  }

  const isProtected = pathname.startsWith('/teacher') || pathname.startsWith('/parent');
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  // Only this middleware may set the trusted-user header — strip whatever a
  // client sent before deciding whether to set it fresh, so nothing a caller
  // supplies can ever reach the page as if it came from middleware.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(TRUSTED_USER_HEADER);

  if (!isProtected && !isAuthPage) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const user = await fetchAuthUser(request);
  if (user) {
    requestHeaders.set(TRUSTED_USER_HEADER, encodeTrustedUser(user));
  }

  if (isProtected) {
    if (!user) {
      const url = new URL('/login', request.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    const required: Role = pathname.startsWith('/teacher') ? 'teacher' : 'parent';
    if (user.role !== required) {
      return NextResponse.redirect(new URL(dashboardFor(user.role), request.url));
    }
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL(dashboardFor(user.role), request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/teacher/:path*', '/parent/:path*', '/login', '/signup', '/api/auth/logout'],
};
