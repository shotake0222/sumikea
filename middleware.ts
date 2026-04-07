import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // セッション取得（これがエラーの元になりやすいので try-catch）
  try {
    const { data: { session } } = await supabase.auth.getSession()

    // /rooms/ 配下でログインしていない場合のみリダイレクト
    if (!session && req.nextUrl.pathname.startsWith('/rooms/')) {
      const propertyId = req.nextUrl.pathname.split('/').pop()
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      if (propertyId) redirectUrl.searchParams.set('id', propertyId)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (e) {
    return res // エラーが起きたらガードせずに通す（500エラーで落とすよりマシ）
  }

  return res
}

export const config = {
  matcher: ['/rooms/:path*'],
}