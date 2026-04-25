import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // すべてのチェックをスルーして、ページ側の遷移ロジックに任せる
  return NextResponse.next();
}

// matcherを空にすることで、ミドルウェアが介入するページをゼロにします
export const config = {
  matcher: [],
};