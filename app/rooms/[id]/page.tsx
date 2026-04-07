import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getNearbyStores } from '@/lib/osm';

export default async function RoomPage({ params }: { params: { id: string } }) {
  // 1. 物件・ゴミ出し・お知らせを並列で取得
  const [propRes, trashRes, newsRes] = await Promise.all([
    supabase.from('properties').select('*').eq('id', params.id).single(),
    supabase.from('trash_schedules').select('*').eq('property_id', params.id),
    supabase.from('announcements').select('*').eq('property_id', params.id).order('created_at', { ascending: false })
  ]);

  if (!propRes.data) return notFound();
  const property = propRes.data;

  // --- 修正箇所：ここから ---
  // 2. 周辺店舗を取得（エラーが起きてもページを落とさない）
  let stores = [];
  try {
    stores = await getNearbyStores(property.lat || 35.698, property.lng || 139.413);
  } catch (error) {
    console.error("OSM API Fetch Error:", error);
    stores = []; // 取得に失敗した場合は空リストにする
  }
  // --- 修正箇所：ここまで ---

  return (
    <main className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20 text-black">
      <header className="bg-blue-600 text-white p-6 shadow-md text-center">
        <h1 className="text-xl font-bold">{property.name}</h1>
        <p className="text-xs opacity-80 mt-1">{property.address}</p>
      </header>

      <div className="p-4 space-y-4">
        {/* ゴミ出しセクション */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-md mb-3 flex items-center">📅 今週のゴミ出し</h2>
          <div className="grid grid-cols-2 gap-2 text-xs text-black">
            {trashRes.data && trashRes.data.length > 0 ? trashRes.data.map((t: any) => (
              <div key={t.id} className="bg-gray-50 p-2 rounded border border-gray-100">
                <span className="font-bold text-blue-600">{t.day_of_week}曜日</span>: {t.category}
              </div>
            )) : <p className="text-gray-400 col-span-2 text-center">スケジュールが未登録です</p>}
          </div>
        </section>

        {/* お知らせセクション */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-md mb-2">📢 管理室から</h2>
          {newsRes.data && newsRes.data.length > 0 ? newsRes.data.slice(0, 1).map((n: any) => (
            <div key={n.id} className="text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-100">
              <p className="font-bold text-yellow-800">{n.title}</p>
              <p className="text-xs text-yellow-700 mt-1">{n.content}</p>
            </div>
          )) : <p className="text-gray-400 text-sm italic">新しいお知らせはありません</p>}
        </section>

        {/* 周辺店舗（OSM連携） */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-md mb-3">🛒 周辺の店舗</h2>
          <div className="space-y-3 text-black">
            {stores.length > 0 ? stores.map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                <span className="font-medium text-gray-700">{s.name}</span>
                <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase">{s.type}</span>
              </div>
            )) : <p className="text-gray-400 text-sm">店舗情報を読み込めませんでした</p>}
          </div>
        </section>
      </div>

      {/* フッターナビ */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t p-4 flex justify-around text-xs text-gray-400 shadow-lg">
        <div className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1">ホーム</div>
        <div>クーポン</div>
        <div>掲示板</div>
        <div>マイ設定</div>
      </nav>
    </main>
  );
}