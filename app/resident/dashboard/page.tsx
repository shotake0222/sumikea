'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResidentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [propertyInfo, setPropertyInfo] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [utilityData, setUtilityData] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchResidentData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login?type=user');
          return;
        }

        // 1. プロフィールと物件情報の取得
        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('*, properties(*)')
          .eq('id', user.id)
          .single();

        // 物件が紐付いていない場合はセットアップ画面へ強制リダイレクト
        if (profError || !prof?.property_id) {
          router.push('/resident/setup');
          return;
        }

        setProfile(prof);
        setUserRole(prof.role);

        // 2. 掲示板データの取得とパーソナライズ
        const now = new Date().toISOString();
        const { data: rawNotices } = await supabase
          .from('property_notifications')
          .select('*')
          .eq('property_id', prof.property_id)
          .or(`expires_at.gt.${now},is_permanent.eq.true`);

        // --- パーソナライズ・ロジック ---
        const sortedNotices = (rawNotices || []).map(notice => {
          let score = 0;
          // 緊急度は最優先
          if (notice.category === 'urgent') score += 1000;
          // ペット飼育者に関連
          if (prof.has_pet && (notice.title + notice.content).includes('ペット')) score += 100;
          // 車利用に関連
          if (prof.primary_transport === 'car' && (notice.title + notice.content).includes('駐車場')) score += 80;
          // 在宅ワークに関連
          if (prof.lifestyle_tags?.includes('remote') && (notice.title + notice.content).includes('工事')) score += 60;
          
          return { ...notice, score };
        }).sort((a, b) => b.score - a.score);

        setNotices(sortedNotices);

        // 3. 生活情報（ゴミの日等）の取得
        const { data: livingInfo } = await supabase
          .from('property_living_info')
          .select('*')
          .eq('property_id', prof.property_id)
          .single();
        
        // 4. インフラ使用量データ
        const { data: utils } = await supabase
          .from('resident_utilities')
          .select('*')
          .eq('user_id', user.id)
          .order('usage_month', { ascending: false })
          .limit(6);

        setPropertyInfo(livingInfo);
        setUtilityData(utils || []);
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
    <div className="max-w-md mx-auto bg-[#F8FAFC] min-h-screen pb-32 font-sans overflow-x-hidden">
      
      {/* ヒーロー：物件名とステータス */}
      <div className="bg-slate-900 p-10 rounded-b-[3.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {profile?.properties?.name} Official
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter italic">
            {profile?.room_number ? `${profile.room_number}号室` : 'My Page'}
          </h1>
        </div>
        {/* 装飾用デザイン要素 */}
        <div className="absolute right-[-5%] top-[-10%] w-56 h-56 bg-blue-600 rounded-full opacity-20 blur-[80px]"></div>
      </div>

      <div className="p-6 space-y-8 -mt-8">
        
        {/* クイックアクション：ゴミカレンダー */}
        <Link href="/resident/trash">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 flex items-center justify-between border border-white active:scale-[0.97] transition-all">
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Next Garbage Day</p>
              <p className="text-xl font-black text-slate-800">
                {propertyInfo?.next_garbage_info || '明日は「燃えるゴミ」'}
              </p>
            </div>
            <div className="bg-slate-900 w-14 h-14 flex items-center justify-center rounded-[1.5rem] text-2xl shadow-lg shadow-slate-200">
              🗑️
            </div>
          </div>
        </Link>

        {/* パーソナライズ掲示板フィード */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Personalized Feed</h2>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase italic">For You</span>
          </div>
          
          <div className="space-y-4">
            {notices.length === 0 ? (
              <div className="bg-white p-10 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-400 text-xs font-bold">現在、重要なお知らせはありません。</p>
              </div>
            ) : (
              notices.map((notice) => (
                <article key={notice.id} 
                  className={`bg-white p-6 rounded-[2.5rem] shadow-sm border-l-8 transition-all hover:shadow-md
                    ${notice.category === 'urgent' ? 'border-red-500' : 'border-blue-500'}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase
                      ${notice.category === 'urgent' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {notice.category === 'urgent' ? 'Important' : 'Notice'}
                    </span>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      {new Date(notice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight mb-2">{notice.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">{notice.content}</p>
                  
                  {notice.pdf_url && (
                    <a href={notice.pdf_url} target="_blank" className="inline-flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">
                      📎 VIEW DOCUMENT
                    </a>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        {/* 分析：光熱費グラフ（既存ロジックのマージ） */}
        <section>
          <div className="flex items-center gap-2 mb-4 ml-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Utility Analytics</h2>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-end gap-3 h-24">
              {utilityData.length > 0 ? utilityData.map((d: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-slate-100 rounded-t-xl relative transition-all group-hover:bg-blue-100" 
                    style={{ height: `${Math.min((d.electricity_kwh / 500) * 100, 100)}%` }}>
                  </div>
                  <span className="text-[8px] font-black text-slate-400">{new Date(d.usage_month).getMonth() + 1}月</span>
                </div>
              )) : (
                <p className="text-[10px] text-slate-300 w-full text-center pb-8">No usage data yet</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* フローティング・タブバー */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] h-20 bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl flex items-center justify-around px-8 border border-white/10">
        <button className="text-blue-500 flex flex-col items-center gap-1">
          <span className="text-2xl">📢</span>
          <span className="text-[7px] font-black uppercase tracking-widest text-white">Board</span>
        </button>
        <Link href="/resident/trash" className="text-slate-500 flex flex-col items-center gap-1">
          <span className="text-2xl opacity-40">🗓️</span>
          <span className="text-[7px] font-black uppercase tracking-widest">Calendar</span>
        </Link>
        <button className="text-slate-500 flex flex-col items-center gap-1">
          <span className="text-2xl opacity-40">📦</span>
          <span className="text-[7px] font-black uppercase tracking-widest">Parcel</span>
        </button>
        <button className="text-slate-500 flex flex-col items-center gap-1">
          <span className="text-2xl opacity-40">⚙️</span>
          <span className="text-[7px] font-black uppercase tracking-widest">Menu</span>
        </button>
      </nav>
    </div>
  );
}