import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // クッキーからセッション情報を取得するためのクライアント作成
  // ※環境変数は Next.js の標準的な方法で読み込みます
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const path = req.nextUrl.pathname;

  // 1. クッキーからアクセストークンを取得してセッションを確認
  // ※Supabaseの標準的なクッキー名「sb-access-token」などを想定
  const { data: { user } } = await supabase.auth.getUser(
    req.cookies.get('sb-access-token')?.value
  );

  // 保護されたパスの判定
  const isProtectedPath = path.startsWith('/admin') || 
                          path.startsWith('/manager') || 
                          path.startsWith('/posting') || 
                          path.startsWith('/shop') || 
                          path.startsWith('/resident');

  // 2. 未ログインならログイン画面へ
  if (!user && isProtectedPath) {
    const redirectUrl = new URL('/login', req.url);
    if (path.startsWith('/admin')) redirectUrl.searchParams.set('type', 'admin');
    if (path.startsWith('/manager')) redirectUrl.searchParams.set('type', 'manager');
    return NextResponse.redirect(redirectUrl);
  }

  // 3. ログイン済みの場合、ロール（権限）とURLが一致するか検問
  if (user) {
    // ユーザーメタデータからロールを取得
    const userRole = (user.user_metadata?.role || 'USER').toUpperCase();

    // 管理者以外の /admin アクセスを拒否
    if (path.startsWith('/admin') && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login?type=admin&error=unauthorized', req.url));
    }

    // 管理会社以外の /manager アクセスを拒否 (ADMINは許可)
    if (path.startsWith('/manager') && (userRole !== 'MANAGER' && userRole !== 'ADMIN')) {
      return NextResponse.redirect(new URL('/login?type=manager&error=unauthorized', req.url));
    }

    // ポスティング業者以外の /posting アクセスを拒否 (ADMINは許可)
    if (path.startsWith('/posting') && (userRole !== 'POSTING' && userRole !== 'ADMIN')) {
      return NextResponse.redirect(new URL('/login?type=posting&error=unauthorized', req.url));
    }

    // 提携店舗以外の /shop アクセスを拒否 (ADMINは許可)
    if (path.startsWith('/shop') && (userRole !== 'SHOP' && userRole !== 'ADMIN')) {
      return NextResponse.redirect(new URL('/login?type=shop&error=unauthorized', req.url));
    }
  }

  return res;
}

// ミドルウェアを適用する範囲
export const config = {
  matcher: [
    '/admin/:path*',
    '/manager/:path*',
    '/posting/:path*',
    '/shop/:path*',
    '/resident/:path*',
  ],
};