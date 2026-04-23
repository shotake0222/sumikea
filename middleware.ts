// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // リクエストされたURLのパスを取得
  const pathname = request.nextUrl.pathname;

  // もし favicon.ico へのリクエストだったら、即座に200 OK（空のレスポンス）を返して終了
  if (pathname === '/favicon.ico') {
    return new NextResponse(null, { status: 200 });
  }

  // それ以外の通常のリクエストはそのまま通す
  return NextResponse.next();
}

// ミドルウェアを適用するパスを指定（すべてのリクエストに適用）
export const config = {
  matcher: '/:path*',
};