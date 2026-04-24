import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // 何も判定せず、すべてをそのまま通す
  return NextResponse.next();
}

// matcherも一旦すべてを対象から外す（空にする）
export const config = {
  matcher: [],
};