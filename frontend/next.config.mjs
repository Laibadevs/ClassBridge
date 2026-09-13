/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Transparently proxies every /api/* call to the real FastAPI backend so
  // the browser only ever talks to this frontend's own domain. Without
  // this, a session cookie set by the backend (a different host once
  // deployed separately, e.g. a different vercel.app subdomain) can never
  // be sent back to the backend on a later browser request that targets
  // this frontend's domain first — middleware.ts's own auth check reads
  // cookies off the incoming request to *this* domain, and a cookie
  // scoped to an unrelated domain is simply never present there, no
  // matter what SameSite/Secure say. Proxying makes every request
  // same-origin from the browser's point of view, so the cookie is scoped
  // to this domain instead and just works.
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
