import { supabase } from '../../lib/supabase';
import { notFound } from 'next/navigation';
// 切り出したボタンコンポーネントをインポート
import TrashUploadButton from '../../components/TrashUploadButton';

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

  if (pError || !property) {
    notFound();
  }

  const [trashData, announcementData, adsData, externalAdsRes] = await Promise.all([
    supabase.from('trash_schedules').select('*').eq('property_id', property.id),
    supabase.from('announcements').select('*').eq('property_id', property.id).order('created_at', { ascending: false }),
    supabase.from('local_ads').select('*').eq('property_id', property.id).limit(5),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/properties/${property.id}/external-info`, { next: { revalidate: 3600 } }).then(res => res.ok ? res.json() : [])
  ]);

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

      {/* ゴミ出し情報セクション：ボタンを外部コンポーネント化 */}
      <section className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold flex items-center">🗑 今日のゴミ出し</h2>
          <TrashUploadButton propertyId={property.id} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {trashData.data?.map((item) => (
            <div key={item.id} className="text-sm p-2 bg-blue-50 text-blue-700 rounded">
              {item.day_of_week}: {item.trash_type}
            </div>
          ))}
          {(!trashData.data || trashData.data.length === 0) && (
            <p className="text-xs text-gray-400 col-span-2 text-center py-2">画像をアップロードして登録</p>
          )}
        </div>
      </section>

      {/* お知らせセクション */}
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

      {/* 広告セクション */}
      <section>
        <h2 className="font-semibold mb-3 text-gray-800">📍 近隣のお得な情報</h2>
        <div className="grid grid-cols-1 gap-4">
          {combinedAds.map((ad, index) => (
            <div 
              key={ad.id || `external-${index}`} 
              className={`overflow-hidden rounded-lg bg-white shadow-sm border ${ad.isExternal ? 'border-gray-100 opacity-90' : 'border-blue-200 ring-1 ring-blue-100'}`}
            >
              {!ad.isExternal && ad.image_url && (
                <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover" />
              )}
              <div className="p-3">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-sm text-gray-800">{ad.title || ad.name}</h3>
                  {!ad.isExternal ? (
                    <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">地元店舗限定</span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">周辺情報</span>
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