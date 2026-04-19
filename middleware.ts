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
const PUBLIC_PATHS = ['/'];

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

  if (!token) {
    // Build redirect URL back to landing page, preserving where they wanted to go
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token present — allow the request through
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
