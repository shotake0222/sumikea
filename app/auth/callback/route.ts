// app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // 重要：メールリンクに含まれるはずの property_id を取得
  const propertyId = requestUrl.searchParams.get('id')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // 物件IDがある場合はその部屋へ、なければトップへ
  if (propertyId) {
    return NextResponse.redirect(`${requestUrl.origin}/rooms/${propertyId}`)
  }
  
  return NextResponse.redirect(requestUrl.origin)
}