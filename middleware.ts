import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // セッション（ログイン状態）の取得
  const { data: { session } } = await supabase.auth.getSession();
  const path = req.nextUrl.pathname;

  // 1. ログインしていない状態で保護されたページにアクセスしようとした場合
  const isProtectedPath = path.startsWith('/admin') || 
                          path.startsWith('/manager') || 
                          path.startsWith('/posting') || 
                          path.startsWith('/shop') || 
                          path.startsWith('/resident');

  if (!session && isProtectedPath) {
    // ログイン画面へ強制送還（パラメータを維持）
    const redirectUrl = new URL('/login', req.url);
    if (path.startsWith('/admin')) redirectUrl.searchParams.set('type', 'admin');
    return NextResponse.redirect(redirectUrl);
  }

  // 2. ログインしている場合、ロール（権限）とURLが一致するか検問
  if (session) {
    // Authのメタデータからロールを取得（DBを叩かないので高速）
    const userRole = (session.user.user_metadata?.role || 'USER').toUpperCase();

    // --- 管理者エリア (/admin) の検問 ---
    if (path.startsWith('/admin') && userRole !== 'ADMIN') {
      // ADMIN以外が管理画面にアクセスしたらログインへ（エラー付与）
      return NextResponse.redirect(new URL('/login?type=admin&error=unauthorized', req.url));
    }

    // --- 管理会社エリア (/manager) の検問 ---
    if (path.startsWith('/manager') && (userRole !== 'MANAGER' && userRole !== 'ADMIN')) {
      return NextResponse.redirect(new URL('/login?type=manager&error=unauthorized', req.url));
    }

    // --- ポスティング業者エリア (/posting) の検問 ---
    if (path.startsWith('/posting') && (userRole !== 'POSTING' && userRole !== 'ADMIN')) {
      return NextResponse.redirect(new URL('/login?type=posting&error=unauthorized', req.url));
    }

    // --- 提携店舗エリア (/shop) の検問 ---
    if (path.startsWith('/shop') && (userRole !== 'SHOP' && userRole !== 'ADMIN')) {
      return NextResponse.redirect(new URL('/login?type=shop&error=unauthorized', req.url));
    }

    // --- 住民エリア (/resident) の検問 ---
    if (path.startsWith('/resident') && (userRole !== 'USER' && userRole !== 'ADMIN')) {
      return NextResponse.redirect(new URL('/login?type=user&error=unauthorized', req.url));
    }
  }

  return res;
}

// ミドルウェアを適用する範囲の設定（重要：不要なファイルには適用しない）
export const config = {
  matcher: [
    '/admin/:path*',
    '/manager/:path*',
    '/posting/:path*',
    '/shop/:path*',
    '/resident/:path*',
  ],
};