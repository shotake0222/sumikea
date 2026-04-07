import { supabase } from '../../lib/supabase' // 「@/」ではなく「../../」を使う

// 2. Next.js 14/15の仕様に合わせ、paramsの型定義をより安全にする
type Props = {
  params: Promise<{ id: string }> | { id: string }
}

export default async function RoomPage({ params }: Props) {
  // paramsを確実に解決（Next.jsのバージョン変化への対策）
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // Supabaseからデータを取得
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  // エラーハンドリング
  if (error || !property) {
    return (
      <div className="p-10 text-center text-red-500">
        物件が見つかりませんでした。<br />
        ID: {id} がDBにあるか確認してください。
      </div>
    )
  }

  return (
    <main className="max-w-md mx-auto p-6 font-sans">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
        <p className="text-sm text-gray-500">{property.address}</p>
      </header>

      <section className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h2 className="font-bold text-blue-800 mb-2">🧹 ゴミ出し案内</h2>
          <div className="text-blue-900 text-sm">
            {/* JSONを文字列として綺麗に表示 */}
            {typeof property.trash_schedule === 'object' 
              ? Object.entries(property.trash_schedule || {}).map(([day, type]) => (
                  <div key={day} className="flex justify-between border-b border-blue-200 py-1 last:border-0">
                    <span className="font-semibold">{day}:</span>
                    <span>{String(type)}</span>
                  </div>
                ))
              : String(property.trash_schedule)}
          </div>
        </div>

        <div className="p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-center">
          <p className="text-gray-400 font-bold">
            📢 近隣のお得情報は準備中です
          </p>
        </div>
      </section>
    </main>
  )
}