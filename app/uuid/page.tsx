import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

interface Props {
  params: { uuid: string };
}

export default async function ResidentDashboard({ params }: Props) {
  const { uuid } = params;

  // 1. 物件情報の取得
  const { data: property, error: pError } = await supabase
    .from('properties')
    .select('*')
    .eq('uuid', uuid)
    .single();

  if (pError || !property) {
    notFound();
  }

  // 2. 関連データの並列取得（外部API補完を追加）
  const [trashData, announcementData, adsData, externalAdsRes] = await Promise.all([
    supabase.from('trash_schedules').select('*').eq('property_id', property.id),
    supabase.from('announcements').select('*').eq('property_id', property.id).order('created_at', { ascending: false }),
    supabase.from('local_ads').select('*').eq('property_id', property.id).limit(5),
    // 外部API (Google Maps等) からの補完データをフェッチ
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/properties/${property.id}/external-info`, { next: { revalidate: 3600 } }).then(res => res.ok ? res.json() : [])
  ]);

  // 3. 自社広告を優先し、外部データを結合
  const combinedAds = [
    ...(adsData.data || []).map(ad => ({ ...ad, isExternal: false })),
    ...externalAdsRes.map((ad: any) => ({ ...ad, isExternal: true }))
  ];

  return (
    <main className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">{property.name}</h1>
        <p className="text-sm text-gray-500">{property.address}</p>
      </header>

      {/* ゴミ出し情報セクション (変更なし) */}
      <section className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-semibold mb-3 flex items-center">🗑 今日のゴミ出し</h2>
        <div className="grid grid-cols-2 gap-2">
          {trashData.data?.map((item) => (
            <div key={item.id} className="text-sm p-2 bg-blue-50 text-blue-700 rounded">
              {item.day_of_week}: {item.trash_type}
            </div>
          ))}
          {(!trashData.data || trashData.data.length === 0) && (
            <p className="text-xs text-gray-400 col-span-2 text-center py-2">カレンダー画像をアップロードして登録</p>
          )}
        </div>
      </section>

      {/* お知らせセクション (変更なし) */}
      <section className="mb-6">
        <h2 className="font-semibold mb-3">📢 管理組合からのお知らせ</h2>
        <div className="space-y-3">
          {announcementData.data?.map((ann) => (
            <div key={ann.id} className="p-3 bg-white rounded-lg border-l-4 border-yellow-400 shadow-sm">
              <p className="text-xs text-gray-400">{new Date(ann.created_at).toLocaleDateString()}</p>
              <h3 className="font-medium text-sm">{ann.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* ハイパーローカル広告セクション (ハイブリッド表示に修正) */}
      <section>
        <h2 className="font-semibold mb-3 text-gray-800">📍 近隣のお得な情報</h2>
        <div className="grid grid-cols-1 gap-4">
          {combinedAds.map((ad, index) => (
            <div 
              key={ad.id || `external-${index}`} 
              className={`overflow-hidden rounded-lg bg-white shadow-sm border ${ad.isExternal ? 'border-gray-100 opacity-90' : 'border-blue-200 ring-1 ring-blue-100'}`}
            >
              {/* 自社広告のみ画像を表示（外部データはプレースホルダーまたは非表示） */}
              {!ad.isExternal && ad.image_url && (
                <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover" />
              )}
              
              <div className="p-3">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-sm text-gray-800">{ad.title || ad.name}</h3>
                  {/* 自社広告には目立つバッジを付与 */}
                  {!ad.isExternal && (
                    <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">
                      地元店舗限定
                    </span>
                  )}
                  {ad.isExternal && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      周辺情報
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{ad.content || ad.address}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}