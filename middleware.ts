// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/favicon.ico') {
    return new NextResponse(null, { status: 200 });
  }
  return NextResponse.next();
}

export const config = { matcher: '/:path*' };