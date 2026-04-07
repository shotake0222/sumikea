import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // /rooms/ で始まるURLに未ログインでアクセスしたらログイン画面へ
  if (!session && req.nextUrl.pathname.startsWith('/rooms/')) {
    const propertyId = req.nextUrl.pathname.split('/').pop()
    return NextResponse.redirect(new URL(`/login?id=${propertyId}`, req.url))
  }

  return res
}

export const config = {
  matcher: ['/rooms/:path*'],
}