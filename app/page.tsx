import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Index() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    // ログイン済みなら、そのユーザーが紐付いている物件IDを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('property_id')
      .eq('id', session.user.id)
      .single()

    if (profile?.property_id) {
      // 物件IDがあれば、そのページへ自動遷移
      redirect(`/rooms/${profile.property_id}`)
    }
  }

  return (
    <div className="p-10 text-center text-black bg-white min-h-screen">
      <h1 className="text-2xl font-bold">sumikeaへようこそ</h1>
      <p className="mt-4 text-gray-600">
        物件専用ポータルを表示するには、配布されたQRコードからアクセスしてください。
      </p>
    </div>
  )
}