import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // 環境変数が正しく渡っているか確認するための最小構成
  const supabase = createMiddlewareClient({ req, res })

  try {
    const { data: { session } } = await supabase.auth.getSession()

    // /rooms/ 以下のページで、セッションがない場合のみリダイレクト
    if (!session && req.nextUrl.pathname.startsWith('/rooms/')) {
      const url = req.nextUrl.clone()
      const propertyId = url.pathname.split('/').pop()
      
      url.pathname = '/login'
      if (propertyId) url.searchParams.set('id', propertyId)
      
      return NextResponse.redirect(url)
    }
  } catch (e) {
    // Middlewareでエラーが起きてもサイト全体を落とさないための回避策
    console.error('Middleware Error:', e)
    return res
  }

  return res
}

// 監視対象を限定する
export const config = {
  matcher: ['/rooms/:path*'],
}