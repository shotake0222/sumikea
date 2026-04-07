export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getNearbyStores } from '@/lib/osm';

export default async function RoomPage({ params }: { params: { id: string } }) {
  // 1. データの並列取得（DBのみ）
  const [propRes, trashRes, newsRes] = await Promise.all([
    supabase.from('properties').select('*').eq('id', params.id).single(),
    supabase.from('trash_schedules').select('*').eq('property_id', params.id),
    supabase.from('announcements').select('*').eq('property_id', params.id).order('created_at', { ascending: false })
  ]);

  if (propRes.error || !propRes.data) return notFound();
  const property = propRes.data;

  // 2. 周辺店舗の取得（もしエラーが起きてもページを落とさない）
  let stores = [];
  try {
    // タイムアウト対策として、もし5秒以上かかったら諦める設定などが望ましいですが、まずはtry-catchで保護
    stores = await getNearbyStores(property.lat || 35.698, property.lng || 139.413);
  } catch (e) {
    console.error("OSM Fetch Error:", e);
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20 text-black">
      <header className="bg-blue-600 text-white p-6 shadow-md text-center">
        <h1 className="text-xl font-bold">{property.name}</h1>
        <p className="text-xs opacity-80 mt-1">{property.address}</p>
      </header>

      <div className="p-4 space-y-4">
        {/* ゴミ出しセクション */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-md mb-3 flex items-center text-blue-600">📅 ゴミ出しカレンダー</h2>
          <div className="grid grid-cols-1 gap-2 text-sm">
            {trashRes.data?.length ? trashRes.data.map((t: any) => (
              <div key={t.id} className="flex justify-between bg-gray-50 p-2 rounded">
                <span className="font-bold">{t.day_of_week}曜日</span>
                <span>{t.category}</span>
              </div>
            )) : <p className="text-gray-400">登録なし</p>}
          </div>
        </section>

        {/* お知らせ */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-md mb-2">📢 お知らせ</h2>
          {newsRes.data?.length ? (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm">
              <p className="font-bold">{newsRes.data[0].title}</p>
              <p className="text-xs mt-1">{newsRes.data[0].content}</p>
            </div>
          ) : <p className="text-gray-400 text-sm">なし</p>}
        </section>

        {/* 周辺店舗（自動取得） */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-md mb-3">🛒 近所のスーパー・コンビニ</h2>
          <div className="space-y-2">
            {stores.length > 0 ? stores.map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                <span>{s.name}</span>
                <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-400 uppercase">{s.type}</span>
              </div>
            )) : <p className="text-gray-400 text-sm">店舗情報を読み込み中、または取得失敗</p>}
          </div>
        </section>
      </div>

      {/* 固定フッター */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t p-4 flex justify-around text-xs text-gray-400">
        <div className="text-blue-600 font-bold">ホーム</div>
        <div>クーポン</div>
        <div>掲示板</div>
        <div>設定</div>
      </nav>
    </main>
  );
}