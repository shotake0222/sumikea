import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  // ログイン画面から引き継いできた物件IDを取得
  const propertyId = requestUrl.searchParams.get('id')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)

    // ログイン成功後、物件IDがあればそのページへ、なければトップへ
    if (propertyId) {
      return NextResponse.redirect(`${requestUrl.origin}/rooms/${propertyId}`)
    }
  }

  // IDがない場合のフォールバック
  return NextResponse.redirect(requestUrl.origin)
}