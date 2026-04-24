'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResidentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResidentData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login?type=user');
          return;
        }

        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('*, properties(*)')
          .eq('id', user.id)
          .single();

        if (profError || !prof?.property_id) {
          router.push('/resident/setup');
          return;
        }

        setProfile(prof);

        // 1. 掲示板・ポスティングデータの取得
        const now = new Date().toISOString();
        const { data: rawNotices } = await supabase
          .from('property_notifications')
          .select('*')
          .eq('property_id', prof.property_id)
          .or(`expires_at.gt.${now},is_permanent.eq.true`);

        const sortedNotices = (rawNotices || []).map(notice => {
          let score = 0;
          if (notice.category === 'urgent') score += 1000;
          if (prof.has_pet && (notice.title + notice.content).includes('ペット')) score += 100;
          return { ...notice, score };
        }).sort((a, b) => b.score - a.score);

        setNotices(sortedNotices);

        // 2. 近隣店舗広告データ（仮設定）
        setAds([
          { id: 1, shop: "駅前スーパー ぽすっと店", title: "タイムセール開催中！", discount: "10% OFF", emoji: "🍎" },
          { id: 2, shop: "クリーニング 24", title: "衣替えキャンペーン", discount: "1点無料", emoji: "👔" }
        ]);

      } catch (err) {
        console.error('Data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResidentData();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-slate-900 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-[#F8FAFC] min-h-screen pb-40 font-sans overflow-x-hidden">
      
      {/* ヒーローヘッダー */}
      <div className="bg-slate-900 p-10 rounded-b-[3.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {profile?.properties?.name} 居住者専用
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter italic">
             {profile?.room_number ? `${profile.room_number}号室` : 'マイページ'}
          </h1>
        </div>
        <div className="absolute right-[-5%] top-[-10%] w-56 h-56 bg-blue-600 rounded-full opacity-20 blur-[80px]"></div>
      </div>

      <div className="p-6 space-y-10 -mt-8">
        
        {/* デジタルポスティング */}
        <section className="relative group">
          <div className="flex justify-between items-end px-2 mb-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">デジタルポスティング</h2>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase italic">最新の投函物</span>
          </div>
          
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
            <div className="bg-slate-800 h-4 mx-12 mt-8 rounded-full shadow-inner opacity-40"></div>
            <div className="p-8">
              {notices.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-200">
                      📬
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 leading-tight">
                        {notices[0].title}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                        ポスティング管理：{new Date(notices[0].created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 bg-slate-50 p-6 rounded-[2rem]">
                    {notices[0].content}
                  </p>
                  <div className="flex gap-3">
                    {notices[0].pdf_url && (
                      <a href={notices[0].pdf_url} target="_blank" className="flex-1 text-center bg-slate-900 text-white text-[10px] font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all">
                        資料を確認する
                      </a>
                    )}
                    <Link href="/resident/settings" className="flex-1 text-center bg-blue-50 text-blue-600 text-[10px] font-black py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center">
                      他 {notices.length} 件の履歴
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-xs font-bold italic">ポストは空です</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 近隣の店舗情報 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
             <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">近隣の店舗情報</h2>
             <div className="h-px flex-1 bg-slate-100"></div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {ads.map((ad) => (
              <Link key={ad.id} href="/resident/settings">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-md border border-slate-50 flex items-center gap-6 active:scale-[0.98] transition-all cursor-pointer">
                  <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center text-3xl shrink-0">
                    {ad.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase mb-1">限定特典</p>
                      <span className="text-sm font-black text-slate-900">{ad.discount}</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-800">{ad.shop}</h4>
                    <p className="text-[10px] text-slate-400 font-bold">{ad.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 掲示板フィード */}
        <section className="space-y-4">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">掲示板フィード</h2>
           <div className="space-y-4">
             {notices.slice(1).map((notice) => (
               <article key={notice.id} className="bg-white/60 p-6 rounded-[2rem] border-l-4 border-slate-300">
                  <p className="text-[9px] font-black text-slate-400 mb-1">{new Date(notice.created_at).toLocaleDateString()}</p>
                  <h4 className="text-xs font-black text-slate-800">{notice.title}</h4>
               </article>
             ))}
           </div>
        </section>
      </div>

      {/* フローティング・ナビゲーション (特典削除) */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl flex items-center justify-around px-8 border border-white/10 z-50">
        <Link href="/resident/dashboard" className="flex flex-col items-center gap-1 group">
          <span className="text-2xl group-active:scale-110 transition-transform">📢</span>
          <span className="text-[7px] font-black uppercase text-blue-500 tracking-widest">掲示板</span>
        </Link>
        <Link href="/resident/settings" className="flex flex-col items-center gap-1 group opacity-40 hover:opacity-100 transition-opacity">
          <span className="text-2xl group-active:scale-110 transition-transform">🔧</span>
          <span className="text-[7px] font-black uppercase text-white tracking-widest">設定</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center gap-1 group opacity-40 hover:opacity-100 transition-opacity">
          <span className="text-2xl group-active:scale-110 transition-transform">👤</span>
          <span className="text-[7px] font-black uppercase text-white tracking-widest">ログアウト</span>
        </Link>
      </nav>

      <footer className="mt-4 pb-12 text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
        Posutto Resident Dashboard v2.5
      </footer>
    </div>
  );
}