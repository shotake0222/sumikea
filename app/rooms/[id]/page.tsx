export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getNearbyStores } from '@/lib/osm';

export default async function RoomPage({ params }: { params: { id: string } }) {
  // 【修正】認証チェック（redirect）を完全に削除しました。
  // これでログインしていなくても、メール認証が終わっていなくても画面が見れます。

  // 1. 物件データの取得
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .single();

  if (propError || !property) return notFound();

  // 2. 周辺情報の取得（OSM）
  let stores = [];
  try {
    stores = await getNearbyStores(property.lat || 35.698, property.lng || 139.413);
  } catch (e) {
    console.error("OSM Error:", e);
  }

  // 3. ゴミ出し情報の取得（仮の実装またはDBから）
  const { data: trash } = await supabase
    .from('trash_schedules')
    .select('*')
    .eq('property_id', params.id);

  return (
    <main className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20 text-black">
      {/* ヘッダー：物件名表示 */}
      <header className="bg-blue-600 text-white p-6 shadow-md text-center">
        <h1 className="text-xl font-bold">{property.name}</h1>
        <p className="text-xs opacity-80 mt-1">{property.address}</p>
      </header>

      <div className="p-4 space-y-4">
        {/* ゴミ出しセクション */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-md mb-3 text-blue-600 flex items-center gap-2">
            <span>📅</span> 今週のゴミ出し
          </h2>
          <div className="space-y-1">
            {trash && trash.length > 0 ? trash.map((t, i) => (
              <p key={i} className="text-sm">
                <span className="font-bold">{t.day_of_week}曜</span>: {t.trash_type}
              </p>
            )) : <p className="text-sm text-gray-400">スケジュール未設定</p>}
          </div>
        </section>

        {/* 周辺店舗セクション（仕様書: 4-B） */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-md mb-3 text-blue-600 flex items-center gap-2">
            <span>🛒</span> 周辺の店舗（立川エリア）
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {stores.length > 0 ? stores.map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm">
                <span className="font-medium text-gray-700">{s.name}</span>
                <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase font-bold">
                  {s.type}
                </span>
              </div>
            )) : <p className="text-xs text-gray-400 p-2">周辺店舗を検索中...</p>}
          </div>
        </section>
      </div>
      
      {/* フッター：仕様書通りのクイックナビを想定 */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 p-4 flex justify-around text-[10px] text-gray-400">
        <div className="flex flex-col items-center opacity-30 text-blue-600"><span>🏠</span>ホーム</div>
        <div className="flex flex-col items-center opacity-30"><span>🔔</span>お知らせ</div>
        <div className="flex flex-col items-center opacity-30"><span>🎟️</span>クーポン</div>
      </footer>
    </main>
  );
}