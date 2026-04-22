'use client';
import { useState } from 'react';
import TrashUploadButton from './TrashUploadButton';
import AdViewLogger from './AdViewLogger';
import AdModal from './AdModal';

export default function ResidentDashboardClient({ property, trashData, announcements, localAds, externalAds }: any) {
  const [showAd, setShowAd] = useState(false);
  
  // 外部と内部の広告を統合
  const combinedAds = [
    ...localAds,
    ...(Array.isArray(externalAds) ? externalAds : []).map((ad: any) => ({ ...ad, isExternal: true }))
  ];

  // ゴミ出し報告が成功した時の処理
  const handleUploadSuccess = () => {
    // 擬似的なAI判定時間を演出してから広告を表示
    setTimeout(() => {
      setShowAd(true);
    }, 800);
  };

  return (
    <main className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen">
      <AdViewLogger propertyUuid={property.uuid} ads={localAds} />

      {/* 広告モーダル（DXの要：ゴミ捨て後に強制表示） */}
      {showAd && localAds.length > 0 && (
        <AdModal ad={localAds[0]} onClose={() => setShowAd(false)} />
      )}

      <header className="mb-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 -mx-4 -mt-4 p-6 mb-6 rounded-b-3xl shadow-lg">
          <h1 className="text-2xl font-bold text-white">{property.name}</h1>
          <p className="text-blue-100 text-sm flex items-center mt-1">📍 {property.address}</p>
        </div>
      </header>

      {/* ゴミ出しセクション */}
      <section className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-gray-800 flex items-center">🗑 今日のゴミ出し</h2>
          {/* 成功時イベントをキャッチ */}
          <TrashUploadButton propertyId={property.uuid} onSuccess={handleUploadSuccess} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {trashData.map((item: any) => (
            <div key={item.id} className="text-sm p-3 bg-blue-50 text-blue-700 rounded-xl font-medium text-center">
              {item.day_of_week}: {item.trash_type}
            </div>
          ))}
        </div>
      </section>

      {/* 広告リスト */}
      <section className="pb-10">
        <h2 className="font-bold mb-4 text-gray-800 px-1">📍 物件限定のお得情報</h2>
        <div className="space-y-4">
          {combinedAds.map((ad, index) => (
            <div key={ad.id || index} className={`overflow-hidden rounded-2xl bg-white shadow-sm border ${ad.isExternal ? 'border-gray-100' : 'border-orange-100 ring-2 ring-orange-50/50'}`}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded inline-block mb-1">
                      {ad.store_name || '周辺店舗'}
                    </span>
                    <h3 className="font-bold text-base text-gray-800 leading-tight">{ad.title || ad.name}</h3>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-3">{ad.content}</p>
                
                {!ad.isExternal && ad.coupon_code && (
                  <div className="bg-yellow-50 border-dashed border-2 border-yellow-200 p-2 rounded-lg text-center mt-2">
                    <p className="text-lg font-mono font-black text-gray-800">{ad.coupon_code}</p>
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