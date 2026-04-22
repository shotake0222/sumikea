'use client';
import ResidentLayout from '../../components/ResidentLayout';
import TrashUploadButton from '../../components/TrashUploadButton';
import AdModal from '../../components/AdModal';
import { brandConfig } from '../../lib/brand';
import { useState } from 'react';

export default function ResidentDashboard({ property, trashData, localAds }: any) {
  const [showAd, setShowAd] = useState(false);

  return (
    <ResidentLayout>
      {showAd && localAds.length > 0 && (
        <AdModal ad={localAds[0]} onClose={() => setShowAd(false)} />
      )}

      <div className="px-4 pt-6 space-y-6">
        {/* 物件情報カード */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-200">
          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-1">Welcome Home</p>
          <h1 className="text-2xl font-black mb-1">{property.name}</h1>
          <p className="text-xs opacity-90 flex items-center">
            <span className="mr-1">📍</span> {property.address}
          </p>
        </div>

        {/* ゴミ出しアクション */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-tight">Today's Trash</h2>
              <p className="text-lg font-bold text-slate-800">今日のゴミ出し</p>
            </div>
            <TrashUploadButton 
              propertyId={property.uuid} 
              onSuccess={() => setShowAd(true)} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {trashData.map((item: any) => (
              <div key={item.id} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 mb-1">{item.day_of_week}</p>
                <p className="text-sm font-black text-blue-600">{item.trash_type}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 広告セクション */}
        <section>
          <div className="flex items-center justify-between px-1 mb-4">
            <h2 className="text-lg font-black text-slate-800">周辺のお得情報</h2>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full italic">Only for Residents</span>
          </div>
          
          <div className="space-y-4">
            {localAds.map((ad: any) => (
              <div key={ad.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm active:scale-[0.98] transition">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase">
                      {ad.store_name}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">{ad.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{ad.content}</p>
                  
                  {ad.coupon_code && (
                    <div className="bg-slate-900 rounded-2xl p-4 flex justify-between items-center text-white">
                      <div>
                        <p className="text-[9px] font-bold opacity-60 uppercase">Coupon Code</p>
                        <p className="text-xl font-mono font-black tracking-tighter">{ad.coupon_code}</p>
                      </div>
                      <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">✂️</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ResidentLayout>
  );
}