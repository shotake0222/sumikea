import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // すべてのチェックをスルーして、ページ側の遷移ロジックに任せる
  return NextResponse.next();
}

// 404や無限ループを避けるため、一旦matcherを空にします
export const config = {
  matcher: [],
};