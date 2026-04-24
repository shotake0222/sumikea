import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Cookieからセッションの有無を確認（Supabaseの標準的なCookie名）
  const session = req.cookies.get('sb-access-token') || req.cookies.get('supabase-auth-token');

  // 1. 未ログインの場合：ログインページ以外へのアクセスをログイン画面へリダイレクト
  if (!session && !path.startsWith('/login')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. ログイン済みの場合：ログインページにアクセスしたら、一旦ダッシュボード（居住者）へ飛ばす
  if (session && path.startsWith('/login')) {
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