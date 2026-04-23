'use client';

import ResidentLayout from '../../components/ResidentLayout';
import TrashUploadButton from '../../components/TrashUploadButton';
import AdModal from '../../components/AdModal';
import OnboardingModal from '../../components/OnboardingModal';
import { brandConfig } from '../../lib/brand';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ResidentDashboard({ property, trashData = [], localAds = [] }: any) {
  const [showAd, setShowAd] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- 【修正】ガードレール：propertyが存在しない（favicon.ico等で誤作動した）場合は何も出さない ---
  if (!property || property.uuid === 'favicon.ico') {
    return null;
  }

  // --- 初回ログイン判定ロジック（セッション復元待ち付き） ---
  useEffect(() => {
    const checkUser = async () => {
      // セッションの確立を少し待つ
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        // セッションがない場合は1秒待って再試行（Vercel等の遅延対策）
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { user: retryUser } } = await supabase.auth.getUser();
        if (!retryUser) {
          // それでもいなければログイン画面へ
          window.location.href = '/login';
          return;
        }
        setUser(retryUser);
      } else {
        setUser(authUser);
      }

      // プロフィールのオンボーディング状態を確認
      if (authUser || user) {
        const targetId = authUser?.id || user?.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_onboarded')
          .eq('id', targetId)
          .single();

        if (!profile || !profile.is_onboarded) {
          setShowOnboarding(true);
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  // --- 閲覧数カウントアップロジック ---
  const incrementViewCount = async (adId: string) => {
    try {
      await supabase.rpc('increment_ad_view', { ad_id: adId });
    } catch (e) {
      console.error('Failed to count view', e);
    }
  };

  useEffect(() => {
    if (localAds && localAds.length > 0) {
      localAds.forEach((ad: any) => incrementViewCount(ad.id));
    }
  }, [localAds]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ResidentLayout>
      {/* オンボーディングモーダル */}
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
          <h1 className="text-2xl font-black mb-1">{property.name || 'My Residence'}</h1>
          <p className="text-xs opacity-90 flex items-center">
            <span className="mr-1">📍</span> {property.address || 'Address not set'}
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
            {trashData && trashData.length > 0 ? (
              trashData.map((item: any) => (
                <div key={item.id} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">{item.day_of_week}</p>
                  <p className="text-sm font-black text-blue-600">{item.trash_type}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 col-span-2 text-center py-4 italic">本日のゴミ出し予定はありません</p>
            )}
          </div>
        </section>

        {/* 広告セクション */}
        <section>
          <div className="flex items-center justify-between px-1 mb-4">
            <h2 className="text-lg font-black text-slate-800">周辺のお得情報</h2>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full italic">Only for Residents</span>
          </div>
          
          <div className="space-y-4">
            {localAds && localAds.length > 0 ? (
              localAds.map((ad: any) => (
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
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">近隣のお得情報はまだありません</p>
            )}
          </div>
        </section>
      </div>
    </ResidentLayout>
  );
}