import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Datacron Route Guard Middleware
 * ================================
 * Runs at the edge BEFORE any page renders.
 * Redirects unauthenticated users to the landing page (/).
 *
 * Protected: everything except / and static assets
 * Public:    / (landing + login), _next/*, favicon, images
 */

// Paths that do NOT require authentication
const PUBLIC_PATHS = ['/', '/politica-de-privacidade', '/termos-de-uso'];
const ADMIN_ONLY_PATHS = ['/analise-previsao'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths and Next.js internals
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isApi = pathname.startsWith('/api');

  if (isPublic || isApi) {
    return NextResponse.next();
  }

  // Check for auth token in cookies (set by api.ts on login)
  const token = request.cookies.get('datacron_token')?.value;
  const refreshToken = request.cookies.get('datacron_refresh_token')?.value;

  if (!token && !refreshToken) {
    // Build redirect URL back to landing page, preserving where they wanted to go
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Basic validation of the JWT structure and expiration
  let payload: { role?: string; exp?: number } | null = null;
  try {
    if (token) {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token structure');
      
      // Decode base64url payload safely
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payloadStr = atob(base64);
      payload = JSON.parse(payloadStr);
      
      // Check expiration
      if (payload?.exp && payload.exp * 1000 < Date.now()) {
        if (!refreshToken) {
           throw new Error('Token expired and no refresh token available');
        }
        // If expired but refresh token is present, let it pass so the client can refresh it
      }
    }
  } catch (error) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('datacron_token');
    return response;
  }

  if (ADMIN_ONLY_PATHS.some(path => pathname.startsWith(path)) && payload?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Token present and valid (or refreshable) — allow the request through
  return NextResponse.next();
}

export const config = {
  /**
   * Match everything EXCEPT:
   * - _next/static (static files)
   * - _next/image  (image optimization)
   * - favicon.ico
   * - Public image/font files
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf)$).*)',
  ],
};
