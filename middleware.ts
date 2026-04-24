import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // 1. 未ログイン時の処理
  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. ログイン済みの場合のロール別アクセス制御
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const role = (profile?.role || 'USER').toUpperCase();
    const path = request.nextUrl.pathname;

    // スプレッドシートの定義に基づいたガード
    if (path.startsWith('/resident') && role !== 'USER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (path.startsWith('/management') && role !== 'MANAGER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (path.startsWith('/posting') && role !== 'POSTING' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (path.startsWith('/shop') && role !== 'SHOP' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (path.startsWith('/properties') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
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