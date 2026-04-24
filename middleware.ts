import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  // 1. 未ログインの場合、/login 以外のページにアクセスしたらログインへ飛ばす
  if (!session && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. ログイン済みの場合のロール別アクセス制御
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const role = (profile?.role || 'USER').toUpperCase();
    const path = req.nextUrl.pathname;

    // --- ロールとパスの整合性チェック（スプレッドシート準拠） ---
    
    // 住民ページへのアクセス
    if (path.startsWith('/resident') && role !== 'USER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // 管理会社ページへのアクセス
    if (path.startsWith('/management') && role !== 'MANAGER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // ポスティング業者ページへのアクセス
    if (path.startsWith('/posting') && role !== 'POSTING' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // 店舗ページへのアクセス
    if (path.startsWith('/shop') && role !== 'SHOP' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // 運営・システム管理ページへのアクセス
    if (path.startsWith('/properties') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return res;
}

// 適用範囲の設定
export const config = {
  matcher: [
    '/resident/:path*',
    '/management/:path*',
    '/posting/:path*',
    '/shop/:path*',
    '/properties/:path*',
  ],
};