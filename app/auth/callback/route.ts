import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    // 1. まずログインを完了させる
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    if (session?.user) {
      // 2. このユーザーが紐付いている物件IDをDBから探す
      const { data: profile } = await supabase
        .from('profiles')
        .select('property_id')
        .eq('id', session.user.id)
        .single()

      if (profile?.property_id) {
        // 物件IDが見つかれば、その専用ページへ自動転送！
        return NextResponse.redirect(`${requestUrl.origin}/rooms/${profile.property_id}`)
      }
    }
  }

  // 物件が不明な場合のみトップページへ
  return NextResponse.redirect(requestUrl.origin)
}