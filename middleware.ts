// middleware.ts (プロジェクトのルート直下)
import { NextResponse } from 'next/server';

export function middleware() {
  return NextResponse.next();
}

// 404を誘発しないよう、一旦 matcher 自体を消すかコメントアウト
export const config = {
  matcher: [],
};