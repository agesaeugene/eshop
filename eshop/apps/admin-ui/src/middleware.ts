import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ⚠️ Replace with the exact cookie name your backend sets on admin login
const ADMIN_COOKIE = 'admin-access-token';

const PUBLIC_PATHS = ['/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except Next internals, API routes and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};