import { supabase } from '../../lib/supabase';
import { notFound } from 'next/navigation';
import TrashUploadButton from '../../components/TrashUploadButton';
import AdViewLogger from '../../components/AdViewLogger'; // ログ収集用（後述）

interface Props {
  params: { uuid: string };
}

export default async function ResidentDashboard({ params }: Props) {
  const { uuid } = params;

  const { data: property, error: pError } = await supabase
    .from('properties')
    .select('*')
    .eq('uuid', uuid)
    .single();

  if (pError || !property || uuid === 'undefined') {
    notFound();
  }

  const [trashData, announcementData, adsData, externalAdsRes] = await Promise.all([
    supabase.from('trash_schedules').select('*').eq('property_id', property.uuid),
    supabase.from('announcements').select('*').eq('property_id', property.uuid).order('created_at', { ascending: false }),
    // local_ads を取得
    supabase.from('local_ads').select('*').eq('property_id', property.uuid).limit(10),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/properties/${property.uuid}/external-info`, { next: { revalidate: 3600 } })
      .then(res => res.ok ? res.json() : [])
      .catch(() => [])
  ]);

  const localAds = (adsData.data || []).map(ad => ({ ...ad, isExternal: false }));
  const combinedAds = [
    ...localAds,
    ...(Array.isArray(externalAdsRes) ? externalAdsRes : []).map((ad: any) => ({ ...ad, isExternal: true }))
  ];

  return (
    <main className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen">
      {/* 閲覧ログ収集コンポーネント（画面には見えません） */}
      <AdViewLogger propertyUuid={property.uuid} ads={localAds} />

      <header className="mb-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 -mx-4 -mt-4 p-6 mb-6 rounded-b-3xl shadow-lg">
          <h1 className="text-2xl font-bold text-white">{property.name}</h1>
          <p className="text-blue-100 text-sm flex items-center mt-1">
            <span className="mr-1">📍</span> {property.address}
          </p>
        </div>
      </header>

      {/* ゴミ出し情報 */}
      <section className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-gray-800 flex items-center">
            <span className="mr-2 text-blue-500">🗑</span> 今日のゴミ出し
          </h2>
          <TrashUploadButton propertyId={property.uuid} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {trashData.data?.map((item) => (
            <div key={item.id} className="text-sm p-3 bg-blue-50 text-blue-700 rounded-xl font-medium text-center">
              {item.day_of_week}: {item.trash_type}
            </div>
          ))}
          {(!trashData.data || trashData.data.length === 0) && (
            <p className="text-xs text-gray-400 col-span-2 text-center py-4">カレンダー未登録</p>
          )}
        </div>
      </section>

      {/* 広告セクション：ポスティングDXのメイン */}
      <section className="pb-10">
        <h2 className="font-bold mb-4 text-gray-800 flex items-center px-1">
          <span className="mr-2 text-orange-500">📍</span> 物件限定の周辺お得情報
        </h2>
        <div className="space-y-4">
          {combinedAds.map((ad, index) => (
            <div 
              key={ad.id || `ad-${index}`} 
              className={`overflow-hidden rounded-2xl bg-white shadow-sm border transition-all ${ad.isExternal ? 'border-gray-100' : 'border-orange-100 ring-2 ring-orange-50/50'}`}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded mb-1 inline-block">
                      {ad.store_name || '周辺店舗'}
                    </span>
                    <h3 className="font-bold text-base text-gray-800 leading-tight">{ad.title || ad.name}</h3>
                  </div>
                  {!ad.isExternal && (
                    <span className="shrink-0 text-[10px] bg-orange-500 text-white px-2 py-1 rounded-md font-black">住民限定</span>
                  )}
                </div>
                
                <p className="text-xs text-gray-600 leading-relaxed mb-3">{ad.content || ad.address}</p>

                {/* クーポン・リンク表示（ポスティングDX機能） */}
                {!ad.isExternal && (
                  <div className="flex flex-col gap-2 mt-2 border-t pt-3">
                    {ad.coupon_code && (
                      <div className="bg-yellow-50 border-dashed border-2 border-yellow-200 p-2 rounded-lg text-center">
                        <p className="text-[10px] text-yellow-700 font-bold mb-1">クーポンコード</p>
                        <p className="text-lg font-mono font-black text-gray-800 tracking-widest">{ad.coupon_code}</p>
                      </div>
                    )}
                    {ad.link_url && (
                      <a 
                        href={ad.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-gray-800 text-white text-center py-2 rounded-xl text-xs font-bold hover:bg-black transition"
                      >
                        詳細を見る・注文する
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}