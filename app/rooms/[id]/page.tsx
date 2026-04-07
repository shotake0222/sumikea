import { supabase } from '@/lib/supabase'

export default async function RoomPage({ params }: { params: { id: string } }) {
  // URLの末尾（ID）を使って、DBから物件情報を1件取得
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !property) {
    return <div className="p-10 text-center">物件が見つかりませんでした。IDを確認してください。</div>
  }

  return (
    <main className="max-w-md mx-auto p-6 font-sans">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold">{property.name}</h1>
        <p className="text-sm text-gray-500">{property.address}</p>
      </header>

      <section className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="font-bold text-blue-800 mb-2">🧹 明日のゴミ出し</h2>
          {/* JSONBの中身を表示 */}
          <p className="text-blue-900 font-medium">
            {JSON.stringify(property.trash_schedule)}
          </p>
        </div>

        <div className="p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-400 text-center font-bold">
            📢 近隣のお得情報は準備中です
          </p>
        </div>
      </section>
    </main>
  )
}