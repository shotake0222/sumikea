'use client'
import { useEffect, Suspense } from 'react' // Suspenseを追加
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthHandler() { // 処理部分を切り分け
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const propertyId = searchParams.get('property_id')

      if (propertyId) {
        await supabase.from('profiles').upsert({
          id: user.id,
          property_id: propertyId,
          email: user.email,
        })
        router.push(`/rooms/${propertyId}`)
      } else {
        router.push('/')
      }
    }
    handleAuth()
  }, [router, searchParams])

  return <div className="p-10 text-center">認証を完了しています...</div>
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="p-10 text-center">読み込み中...</div>}>
      <AuthHandler />
    </Suspense>
  )
}