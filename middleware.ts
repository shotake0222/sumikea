// middleware.ts (一旦リセット)
import { NextResponse } from 'next/server';
export function middleware() { return NextResponse.next(); }
export const config = { matcher: [] };