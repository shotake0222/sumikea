import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// この行を追加して、ビルド時の静的生成を回避します
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const propertyId = requestUrl.searchParams.get('id')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    // 認可コードをセッションに交換
    await supabase.auth.exchangeCodeForSession(code)
  }

  // 物件IDがあればその物件ページへ、なければトップへ
  if (propertyId) {
    return NextResponse.redirect(`${requestUrl.origin}/rooms/${propertyId}`)
  }

  return NextResponse.redirect(requestUrl.origin)
}