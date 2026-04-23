import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // ブラウザが favicon.ico を探そうとしたら、奥に通さずここで追い返す
  if (request.nextUrl.pathname.includes('favicon.ico')) {
    return new NextResponse(null, { status: 200 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};