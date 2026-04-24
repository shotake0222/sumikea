import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server'; // ここを server に修正

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Cookieからセッションを確認
  const session = req.cookies.get('sb-access-token') || req.cookies.get('supabase-auth-token');

  // 1. 未ログイン時のガード
  if (!session && !path.startsWith('/login')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. ログイン済みでログインページに来た場合
  if (session && path === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/resident/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/resident/:path*',
    '/management/:path*',
    '/posting/:path*',
    '/shop/:path*',
    '/properties/:path*',
  ],
};