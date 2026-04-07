'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuth = async () => {
      // 1. 現在のログインユーザーを取得
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // URLからproperty_idを取得（例: ?property_id=xxx）
      const propertyId = searchParams.get('property_id')

      if (propertyId) {
        // 2. profilesテーブルに物件IDを保存（初回登録）
        await supabase.from('profiles').upsert({
          id: user.id,
          property_id: propertyId,
          email: user.email,
        })
        
        // 3. 紐付けが終わったら、その物件ページへ飛ばす
        router.push(`/rooms/${propertyId}`)
      } else {
        router.push('/')
      }
    }
    handleAuth()
  }, [router, searchParams])

  return <div className="p-10 text-center">認証を完了しています...</div>
}