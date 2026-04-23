'use client';

// ✅ 修正：コンポーネントのインポートから波括弧 { } を削除
// これにより 'Attempted import error' を解消します
import ResidentLayout from '../../../components/ResidentLayout';
import TrashUploadButton from '../../../components/TrashUploadButton';
import AdModal from '../../../components/AdModal';
import OnboardingModal from '../../../components/OnboardingModal';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ResidentDashboard({ property, trashData = [], localAds = [] }: any) {
  const [showAd, setShowAd] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- 閲覧数カウントアップロジック ---
  const incrementViewCount = async (adId: string) => {
    try {
      await supabase.rpc('increment_ad_view', { ad_id: adId });
    } catch (e) {
      console.error('Failed to count view', e);
    }
  };

  useEffect(() => {
    // 1. favicon.ico や不正な物件IDを弾く
    if (!property || !property.uuid || property.uuid === 'favicon.ico') {
      setLoading(false);
      return;
    }

    const checkUser = async () => {
      // 2. セッションの取得（必要に応じてリトライ）
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let currentUser = authUser;

      if (!currentUser) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { user: retryUser } } = await supabase.auth.getUser();
        currentUser = retryUser;
      }

      if (!currentUser) {
        window.location.href = '/login';
        return;
      }

      setUser(currentUser);

      // 3. オンボーディング済みかチェック
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_onboarded')
        .eq('id', currentUser.id)
        .single();

      if (!profile || !profile.is_onboarded) {
        setShowOnboarding(true);
      }
      
      setLoading(false);
    };
    
    checkUser();
  }, [property]);

  useEffect(() => {
    if (localAds && localAds.length > 0) {
      localAds.forEach((ad: any) => incrementViewCount(ad.id));
    }
  }, [localAds]);

  // --- ガードレール（早期リターン）---
  if (!property || !property.uuid || property.uuid === 'favicon.ico') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
        物件情報が見つかりませんでした。
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ResidentLayout>
      {showOnboarding && user && (
        <OnboardingModal 
          userId={user.id} 
          propertyId={property.uuid} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}

      {showAd && localAds && localAds.length > 0 && (
        <AdModal ad={localAds[0]} onClose={() => setShowAd(false)} />
      )}

      <div className="px-4 pt-6 space-y-6 pb-24">
        {/* 物件情報カード */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-200">
          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-1">Welcome Home</p>
          <h1 className="text-2xl font-black mb-1">{property?.name || '物件名未設定'}</h1>
          <p className="text-xs opacity-90 flex items-center">
            <span className="mr-1">📍</span> {property?.address || '住所未設定'}
          </p>
        </div>

        {/* ゴミ出しセクション */}
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
            {trashData && trashData.length > 0 ? (
              trashData.map((item: any) => (
                <div key={item.id} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">{item.day_of_week}</p>
                  <p className="text-sm font-black text-blue-600">{item.trash_type}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 col-span-2 text-center py-4 italic">予定はありません</p>
            )}
          </div>
        </section>

        {/* 広告セクション */}
        <section>
          <div className="flex items-center justify-between px-1 mb-4">
            <h2 className="text-lg font-black text-slate-800">周辺のお得情報</h2>
          </div>
          
          <div className="space-y-4">
            {localAds && localAds.length > 0 ? (
              localAds.map((ad: any) => (
                <div key={ad.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm active:scale-[0.98] transition p-5">
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase mb-2 inline-block">
                    {ad.store_name}
                  </span>
                  <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">{ad.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{ad.content}</p>
                  
                  {ad.coupon_code && (
                    <div className="bg-slate-900 rounded-2xl p-4 flex justify-between items-center text-white">
                      <div>
                        <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Coupon Code</p>
                        <p className="text-xl font-mono font-black">{ad.coupon_code}</p>
                      </div>
                      <div className="text-2xl">✂️</div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-10 italic">現在お知らせはありません</p>
            )}
          </div>
        </section>
      </div>
    </ResidentLayout>
  );
}