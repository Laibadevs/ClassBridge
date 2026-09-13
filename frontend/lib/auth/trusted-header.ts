// Contract between middleware.ts (Edge runtime) and lib/auth/server.ts (Node
// runtime) for forwarding an already-verified session within a single
// request, so a protected-route render doesn't re-ask the backend a question
// middleware just asked. Kept dependency-free (no 'server-only', no Node or
// Edge-specific APIs) so both runtimes can import it safely.
import type { Role } from '@/lib/types';

export const TRUSTED_USER_HEADER = 'x-cb-verified-user';

export interface TrustedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export function encodeTrustedUser(user: TrustedUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

/**
 * Only middleware ever writes this header, and only after verifying the
 * session against FastAPI — but a caller here has no way to know that on
 * its own, so the shape is validated defensively rather than trusted blindly.
 */
export function decodeTrustedUser(raw: string | null): TrustedUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (
      parsed &&
      typeof parsed.id === 'string' &&
      typeof parsed.email === 'string' &&
      typeof parsed.name === 'string' &&
      (parsed.role === 'teacher' || parsed.role === 'parent')
    ) {
      return parsed as TrustedUser;
    }
  } catch {
    // fall through
  }
  return null;
}
