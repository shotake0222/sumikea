'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResidentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]); // 管理組合・物件通知
  const [postingNotices, setPostingNotices] = useState<any[]>([]); // ✅ ぽすっとセクション用
  const [ads, setAds] = useState<any[]>([]); 
  const [trashSchedules, setTrashSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [garbageCalendars, setGarbageCalendars] = useState<any>({}); 
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [uploading, setUploading] = useState(false);

  // 計測用
  const viewStartTime = useRef<number | null>(null);
  const impressionTracked = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchResidentData();
    return () => { handleTrackDuration(); };
  }, []);

  const fetchResidentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login?type=user';
        return;
      }

      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*, properties(*)')
        .eq('id', user.id)
        .single();

      if (profError) console.error('DB取得エラー:', profError);
      if (prof?.role === 'USER' && !prof?.property_id) {
        window.location.href = '/resident/setup';
        return;
      }

      setProfile(prof);
      setGarbageCalendars(prof?.monthly_garbage_calendars || {});

      if (prof?.property_id) {
        // 1. 通常の物件掲示板（管理組合など）
        const { data: rawNotices } = await supabase
          .from('property_notifications')
          .select('*')
          .eq('property_id', prof.property_id)
          .order('created_at', { ascending: false });
        setNotices(rawNotices || []);

        // 2. ✅ ぽすっとセクション（ポスティング業者からの重要告知）
        // categoryやsender_roleで判別する運用を想定
        const { data: rawPosting } = await supabase
          .from('property_notifications')
          .select('*')
          .eq('property_id', prof.property_id)
          .eq('category', 'posting') 
          .order('created_at', { ascending: false })
          .limit(1);
        setPostingNotices(rawPosting || []);

        // 3. ゴミスケ
        const { data: trashData } = await supabase
          .from('trash_schedules')
          .select('*')
          .eq('property_id', prof.property_id);
        setTrashSchedules(trashData || []);

        // 4. ✅ デジタルチラシ（ダミー排除・実データのみ）
        const { data: rawAds } = await supabase
          .from('digital_flyers')
          .select('*')
          .eq('property_id', prof.property_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        
        setAds(rawAds || []);
      }
    } catch (err) {
      console.error('取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  // インプレッション（表示されただけでカウント）の自動計測
  useEffect(() => {
    if (ads.length > 0) {
      ads.forEach(ad => {
        if (!impressionTracked.current.has(ad.id)) {
          supabase.rpc('increment_ad_views', { target_ad_id: ad.id });
          impressionTracked.current.add(ad.id);
        }
      });
    }
  }, [ads]);

  const handleTrackDuration = async (adId?: string) => {
    if (viewStartTime.current && adId) {
      const duration = Math.round((Date.now() - viewStartTime.current) / 1000);
      if (duration > 0) {
        await supabase.rpc('add_ad_duration', { target_ad_id: adId, duration_seconds: duration });
      }
      viewStartTime.current = null;
    }
  };

  const handleAdInteraction = async (adId: string, pdfUrl: string) => {
    viewStartTime.current = Date.now();
    try {
      await supabase.rpc('increment_ad_clicks', { target_ad_id: adId });
      if (pdfUrl && pdfUrl !== '#') {
        window.open(pdfUrl, '_blank');
        await supabase.rpc('add_ad_duration', { target_ad_id: adId, duration_seconds: 5 });
      } else {
        alert('チラシの詳細準備中です');
      }
    } catch (err) {
      console.error('計測エラー:', err);
    }
  };

  const getTodayTrash = () => {
    const dayMap = ["日", "月", "火", "水", "木", "金", "土"];
    const todayStr = dayMap[new Date().getDay()];
    return trashSchedules.filter(item => item.day_of_week === todayStr);
  };

  const handleCalendarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `garbage/${user?.id}/${selectedMonth}_${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('user_documents').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('user_documents').getPublicUrl(filePath);
      const updated = { ...garbageCalendars, [selectedMonth]: publicUrl };
      await supabase.from('profiles').update({ monthly_garbage_calendars: updated }).eq('id', user?.id);
      setGarbageCalendars(updated);
      alert('カレンダーを更新しました');
    } catch (err) {
      alert('エラーが発生しました');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-slate-900 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-[#F8FAFC] min-h-screen pb-40 font-sans overflow-x-hidden relative">
      
      {/* ヘッダー */}
      <div className="bg-slate-900 p-8 pt-12 rounded-b-[3.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {profile?.properties?.name || '物件ポータル'}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter italic">
             {profile?.room_number ? `${profile.room_number}号室` : 'マイページ'}
          </h1>
        </div>
      </div>

      <div className="p-5 space-y-8 -mt-6 relative z-20">
        
        {/* ゴミ出し */}
        <section className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200 border border-white">
          <div className="bg-emerald-500 p-4 text-white flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">今日のゴミ収集</span>
            <span className="text-sm font-black italic">
              {getTodayTrash().length > 0 ? getTodayTrash().map(t => t.trash_type).join('・') : '収集なし'}
            </span>
          </div>
          <div className="p-3 min-h-[180px] flex items-center justify-center bg-slate-50">
            {garbageCalendars[selectedMonth] ? (
              <img src={garbageCalendars[selectedMonth]} className="w-full h-auto rounded-xl shadow-sm cursor-pointer" onClick={() => window.open(garbageCalendars[selectedMonth], '_blank')} />
            ) : (
              <p className="text-[11px] font-black text-slate-400 italic">{selectedMonth}月のカレンダー未登録</p>
            )}
          </div>
        </section>

        {/* デジタル掲示板（管理組合） */}
        <section className="bg-white rounded-[3rem] shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="p-8">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center italic">デジタル掲示板</h2>
            {notices.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 leading-tight">{notices[0].title}</h3>
                <p className="text-[13px] text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-[1.5rem] whitespace-pre-wrap">{notices[0].content}</p>
              </div>
            ) : (
              <p className="text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest py-4">通知はありません</p>
            )}
          </div>
        </section>

        {/* ✅ ぽすっとセクション（ポスティング会社からの重要投稿） */}
        <section className="bg-indigo-900 rounded-[3rem] shadow-2xl border border-indigo-800 overflow-hidden text-white relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">📬</div>
          <div className="p-8">
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 italic">ぽすっと重要告知</h2>
            {postingNotices.length > 0 ? (
              <div className="space-y-4">
                <div className="inline-block px-2 py-0.5 bg-indigo-500 text-[8px] font-black rounded-full uppercase mb-2">ポスティング業者より</div>
                <h3 className="text-lg font-black leading-tight mb-2">{postingNotices[0].title}</h3>
                <p className="text-[12px] text-indigo-100 leading-relaxed opacity-90">{postingNotices[0].content}</p>
              </div>
            ) : (
              <div className="py-4 opacity-40 text-[10px] font-bold uppercase text-center tracking-widest">
                現在、業者からの重要なお知らせはありません
              </div>
            )}
          </div>
        </section>

        {/* 近隣店舗（デジタルチラシ）: ダミー排除済み */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 italic">近隣のお得な情報</h2>
          <div className="grid grid-cols-1 gap-3">
            {ads.length > 0 ? ads.map((ad) => (
              <div 
                key={ad.id} 
                onClick={() => handleAdInteraction(ad.id, ad.pdf_url)}
                className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 flex items-center gap-5 active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-xl shrink-0">
                  {ad.target_metadata?.emoji || '🏷️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-amber-600 uppercase mb-0.5 tracking-wider">{ad.target_metadata?.discount || 'SALE'}</p>
                  <h4 className="text-sm font-black text-slate-800 truncate">{ad.title}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{ad.content || '詳細はこちら'}</p>
                </div>
                <div className="text-slate-300">→</div>
              </div>
            )) : (
              <div className="py-10 text-center bg-slate-100/50 rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">現在、配信中のチラシはありません</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ナビゲーション */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-50">
        <nav className="max-w-sm mx-auto h-20 bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl flex items-center justify-around px-4 border border-white/10">
          <Link href="/resident/dashboard" className="flex flex-col items-center gap-1">
            <span className="text-2xl">📢</span>
            <span className="text-[8px] font-black uppercase text-blue-500 tracking-widest">掲示板</span>
          </Link>
          <label className="flex flex-col items-center gap-1 cursor-pointer">
            <span className="text-2xl">{uploading ? '⏳' : '📅'}</span>
            <span className="text-[8px] font-black uppercase text-white tracking-widest opacity-60">表登録</span>
            <input type="file" className="hidden" onChange={handleCalendarUpload} accept="image/*,application/pdf" disabled={uploading} />
          </label>
          <button onClick={() => { supabase.auth.signOut(); window.location.href = '/login'; }} className="flex flex-col items-center gap-1 opacity-60">
            <span className="text-2xl">👤</span>
            <span className="text-[8px] font-black uppercase text-white tracking-widest">終了</span>
          </button>
        </nav>
      </div>
    </div>
  );
}