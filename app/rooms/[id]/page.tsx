export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getNearbyStores } from '@/lib/osm';

export default async function RoomPage({ params }: { params: { id: string } }) {
  // --- デバッグ用：データの取得を一つずつ安全に行う ---
  
  // 1. 物件情報の取得
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .single();

  if (propError || !property) {
    return (
      <div className="p-10 text-red-500 bg-white min-h-screen">
        <h1>物件データの取得に失敗しました</h1>
        <pre className="text-xs mt-4 bg-gray-100 p-2">{JSON.stringify(propError, null, 2)}</pre>
        <p className="mt-4 text-black">ID: {params.id}</p>
      </div>
    );
  }

  // 2. ゴミ出し・お知らせの取得（失敗しても続行）
  const { data: trashSchedules } = await supabase.from('trash_schedules').select('*').eq('property_id', params.id);
  const { data: announcements } = await supabase.from('announcements').select('*').eq('property_id', params.id);

  // 3. 周辺店舗の取得（OSM APIを一旦止めてみる、または超安全に実行）
  let stores = [];
  // 原因切り分けのため、一度ここをコメントアウトして 500 が消えるか見てもOK
  /*
  try {
    stores = await getNearbyStores(property.lat || 35.698, property.lng || 139.413);
  } catch (e) {
    console.error("OSM Error");
  }
  */

  return (
    <main className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20 text-black">
      <header className="bg-blue-600 text-white p-6 text-center">
        <h1 className="text-xl font-bold">{property.name}</h1>
        <p className="text-xs opacity-80">{property.address}</p>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-green-100 p-3 rounded text-green-800 text-xs font-bold">
          ✅ Supabaseとの接続に成功しました！
        </div>

        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-md mb-3 flex items-center">📅 今週のゴミ出し</h2>
          <div className="text-sm">
            {trashSchedules?.length ? trashSchedules.map((t: any) => (
              <p key={t.id}>{t.day_of_week}曜: {t.category}</p>
            )) : "データがありません"}
          </div>
        </section>
      </div>
    </main>
  );
}