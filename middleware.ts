import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Marketing-site hosts. When the apex or www domain is hit at the root path,
// serve the public one-page marketing site (app/site) instead of the app.
const MARKETING_HOSTS = new Set(['nightingale.im', 'www.nightingale.im']);

export function middleware(request: NextRequest) {
  // Behind the production proxy (Cloudflare + platform), the public domain is
  // usually carried in x-forwarded-host; fall back to the Host header, then to
  // the parsed request hostname.
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.hostname ||
    '';
  // x-forwarded-host can be a comma-separated list; take the first entry.
  const host = rawHost.split(',')[0].split(':')[0].trim().toLowerCase();
  const { pathname } = request.nextUrl;

  if (pathname === '/' && MARKETING_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.pathname = '/site';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on the root path only; skip API routes, Next internals and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
