import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // 重要：メールのリンクから物件ID（id）を受け取る
  const propertyId = requestUrl.searchParams.get('id')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    // 認可コードをセッションに交換（これでログイン完了）
    await supabase.auth.exchangeCodeForSession(code)
  }

  // 物件IDがある場合はその部屋へ、なければトップへ
  if (propertyId) {
    // 例: /rooms/036097d4... へリダイレクト
    return NextResponse.redirect(`${requestUrl.origin}/rooms/${propertyId}`)
  }
  
  // 物件IDが不明な場合のみトップページへ
  return NextResponse.redirect(requestUrl.origin)
}