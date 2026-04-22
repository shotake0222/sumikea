import { supabase } from '../../lib/supabase';
import { notFound } from 'next/navigation';
import TrashUploadButton from '../../components/TrashUploadButton';

interface Props {
  params: { uuid: string };
}

export default async function ResidentDashboard({ params }: Props) {
  const { uuid } = params;

  // 1. 物件情報をUUIDで取得
  const { data: property, error: pError } = await supabase
    .from('properties')
    .select('*')
    .eq('uuid', uuid)
    .single();

  // 物件が見つからない、またはURLが'undefined'の時は404へ
  if (pError || !property || uuid === 'undefined') {
    console.error("Property fetch error:", pError);
    notFound();
  }

  // 2. 関連データを一括取得（property.uuid で紐付け）
  // ※DBのproperty_idカラムをUUID型に直した前提です
  const [trashData, announcementData, adsData, externalAdsRes] = await Promise.all([
    supabase.from('trash_schedules').select('*').eq('property_id', property.uuid),
    supabase.from('announcements').select('*').eq('property_id', property.uuid).order('created_at', { ascending: false }),
    supabase.from('local_ads').select('*').eq('property_id', property.uuid).limit(5),
    // 周辺店舗情報の取得（外部API）
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/properties/${property.uuid}/external-info`, { next: { revalidate: 3600 } })
      .then(res => res.ok ? res.json() : [])
      .catch(() => [])
  ]);

  const combinedAds = [
    ...(adsData.data || []).map(ad => ({ ...ad, isExternal: false })),
    ...(Array.isArray(externalAdsRes) ? externalAdsRes : []).map((ad: any) => ({ ...ad, isExternal: true }))
  ];

  return (
    <main className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen">
      <header className="mb-6">
        <div className="bg-blue-600 -mx-4 -mt-4 p-6 mb-6 rounded-b-3xl shadow-lg">
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
            <span className="mr-2">🗑</span> 今日のゴミ出し
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
            <p className="text-xs text-gray-400 col-span-2 text-center py-4 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
              カレンダー未登録
            </p>
          )}
        </div>
      </section>

      {/* お知らせ */}
      <section className="mb-6">
        <h2 className="font-bold mb-3 text-gray-800 flex items-center">
          <span className="mr-2">📢</span> 管理組合からのお知らせ
        </h2>
        <div className="space-y-3">
          {announcementData.data?.length ? (
            announcementData.data.map((ann) => (
              <div key={ann.id} className="p-4 bg-white rounded-xl border-l-4 border-yellow-400 shadow-sm">
                <p className="text-[10px] text-gray-400 mb-1">{new Date(ann.created_at).toLocaleDateString()}</p>
                <h3 className="font-bold text-sm text-gray-800">{ann.title}</h3>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 text-xs py-4">現在お知らせはありません</p>
          )}
        </div>
      </section>

      {/* 広告セクション */}
      <section className="pb-10">
        <h2 className="font-bold mb-3 text-gray-800 flex items-center">
          <span className="mr-2">📍</span> 近隣のお得な情報
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {combinedAds.length > 0 ? (
            combinedAds.map((ad, index) => (
              <div 
                key={ad.id || `ad-${index}`} 
                className={`overflow-hidden rounded-2xl bg-white shadow-sm border transition-all ${ad.isExternal ? 'border-gray-100' : 'border-blue-200 ring-2 ring-blue-50'}`}
              >
                {!ad.isExternal && ad.image_url && (
                  <img src={ad.image_url} alt={ad.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-base text-gray-800 leading-tight">{ad.title || ad.name || ad.store_name}</h3>
                    {!ad.isExternal && (
                      <span className="shrink-0 text-[10px] bg-blue-600 text-white px-2 py-1 rounded-md font-black ml-2">限定</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed mb-1">{ad.content || ad.address}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 text-xs py-10">周辺にお得な情報は見つかりませんでした</p>
          )}
        </div>
      </section>
    </main>
  );
}