export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import { notFound, redirect } from 'next/navigation'; // redirectを追加
import { getNearbyStores } from '@/lib/osm';

export default async function RoomPage({ params }: { params: { id: string } }) {
  // 1. 【門番の代わり】ログインチェックをここで行う
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // ログインしていなければ、IDを持ってログイン画面へ飛ばす
    redirect(`/login?id=${params.id}`);
  }

  // 2. データの取得（ここからはさっきと同じ）
  const [propRes, trashRes, newsRes] = await Promise.all([
    supabase.from('properties').select('*').eq('id', params.id).single(),
    supabase.from('trash_schedules').select('*').eq('property_id', params.id),
    supabase.from('announcements').select('*').eq('property_id', params.id).order('created_at', { ascending: false })
  ]);

  if (propRes.error || !propRes.data) return notFound();
  const property = propRes.data;

  let stores = [];
  try {
    stores = await getNearbyStores(property.lat || 35.698, property.lng || 139.413);
  } catch (e) {
    console.error("OSM Error");
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20 text-black">
      {/* ... (以下、さきほどのデザインコードと同じ) ... */}
      <header className="bg-blue-600 text-white p-6 shadow-md text-center">
        <h1 className="text-xl font-bold">{property.name}</h1>
        <p className="text-xs opacity-80 mt-1">{property.address}</p>
      </header>

      <div className="p-4 space-y-4">
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-md mb-3 text-blue-600">📅 ゴミ出しカレンダー</h2>
          <div className="grid grid-cols-1 gap-2 text-sm">
            {trashRes.data?.map((t: any) => (
              <div key={t.id} className="flex justify-between bg-gray-50 p-2 rounded">
                <span className="font-bold">{t.day_of_week}曜日</span>
                <span>{t.category}</span>
              </div>
            )) || <p>データなし</p>}
          </div>
        </section>

        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-md mb-3 text-blue-600">🛒 周辺の店舗</h2>
          <div className="space-y-2">
            {stores.map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                <span>{s.name}</span>
                <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-400">{s.type}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}