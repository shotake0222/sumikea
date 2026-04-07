export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import { notFound, redirect } from 'next/navigation';
import { getNearbyStores } from '@/lib/osm';

export default async function RoomPage({ params }: { params: { id: string } }) {
  // 1. ログインチェック
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`/login?id=${params.id}`);
  }

  // 2. 【重要】ユーザーと物件の紐付け（未登録なら作成）
  // profilesテーブルに property_id を書き込む
  await supabase
    .from('profiles')
    .upsert({ 
      id: session.user.id, 
      property_id: params.id,
      updated_at: new Date()
    });

  // 3. 物件データの取得
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .single();

  if (propError || !property) return notFound();

  // 4. 周辺情報の取得（OSM）
  let stores = [];
  try {
    stores = await getNearbyStores(property.lat || 35.698, property.lng || 139.413);
  } catch (e) {
    console.error("OSM Error");
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20 text-black">
      <header className="bg-blue-600 text-white p-6 shadow-md text-center">
        <h1 className="text-xl font-bold">{property.name}</h1>
        <p className="text-xs opacity-80 mt-1">{property.address}</p>
      </header>

      <div className="p-4 space-y-4">
        {/* 物件専用コンテンツを表示 */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-md mb-3 text-blue-600">📅 今週のゴミ出し</h2>
          <p className="text-sm text-gray-500">（ここにDBのスケジュールが表示されます）</p>
        </section>

        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-md mb-3 text-blue-600">🛒 周辺の店舗（立川エリア）</h2>
          <div className="space-y-2">
            {stores.length > 0 ? stores.map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                <span>{s.name}</span>
                <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-400 uppercase">{s.type}</span>
              </div>
            )) : <p className="text-xs text-gray-400">店舗情報を取得中...</p>}
          </div>
        </section>
      </div>
    </main>
  );
}