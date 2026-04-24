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
  
  // ゴミカレンダー用ステート
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [uploading, setUploading] = useState(false);
  const [garbageCalendars, setGarbageCalendars] = useState<any>({}); // { "1": "url", "2": "url"... }

  useEffect(() => {
    fetchResidentData();
  }, [router]);

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
      // DBに保存されている月別URL（JSONB想定）をセット。なければ空オブジェクト
      setGarbageCalendars(prof.monthly_garbage_calendars || {});

      const now = new Date().toISOString();
      const { data: rawNotices } = await supabase
        .from('property_notifications')
        .select('*')
        .eq('property_id', prof.property_id)
        .or(`expires_at.gt.${now},is_permanent.eq.true`);

      setNotices(rawNotices || []);

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

  // 月別カレンダーアップロード処理
  const handleCalendarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `garbage/${user.id}/${selectedMonth}_${Date.now()}.${fileExt}`;

      // 1. Storageへアップ
      const { error: uploadError } = await supabase.storage
        .from('user_documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. 公開URL取得
      const { data: { publicUrl } } = supabase.storage
        .from('user_documents')
        .getPublicUrl(filePath);

      // 3. profilesテーブルの monthly_garbage_calendars (JSONBカラム) を更新
      const updatedCalendars = { ...garbageCalendars, [selectedMonth]: publicUrl };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ monthly_garbage_calendars: updatedCalendars })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setGarbageCalendars(updatedCalendars);
      alert(`${selectedMonth}月のカレンダーを登録しました`);
    } catch (err) {
      console.error(err);
      alert('アップロードに失敗しました');
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
        
        {/* 月別ゴミカレンダー・アップローダー */}
        <section className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200 border border-white">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">My Garbage Calendar</h2>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">月別登録</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {[...Array(12)].map((_, i) => {
              const m = i + 1;
              const isRegistered = !!garbageCalendars[m];
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`flex-shrink-0 w-12 h-12 rounded-2xl font-black text-xs transition-all border-2 
                    ${selectedMonth === m ? 'bg-slate-900 text-white border-slate-900 scale-110' : 
                      isRegistered ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-50'}`}
                >
                  {m}月
                </button>
              );
            })}
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
            {garbageCalendars[selectedMonth] ? (
              <div className="space-y-3 text-center">
                <p className="text-[10px] font-bold text-slate-500">{selectedMonth}月のカレンダーは登録済みです</p>
                <a 
                  href={garbageCalendars[selectedMonth]} 
                  target="_blank" 
                  className="inline-block w-full bg-blue-600 text-white text-[10px] font-black py-3 rounded-xl shadow-lg shadow-blue-200"
                >
                  表示して確認する
                </a>
                <label className="block text-[9px] text-blue-500 font-bold cursor-pointer underline">
                  ファイルを変更する
                  <input type="file" className="hidden" onChange={handleCalendarUpload} accept="image/*,application/pdf" />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center py-4 cursor-pointer">
                <span className="text-2xl mb-1">{uploading ? '⏳' : '📤'}</span>
                <span className="text-[10px] font-black text-slate-500">
                  {uploading ? 'アップロード中...' : `${selectedMonth}月の表をアップロード`}
                </span>
                <input type="file" className="hidden" onChange={handleCalendarUpload} accept="image/*,application/pdf" disabled={uploading} />
              </label>
            )}
          </div>
        </section>

        {/* デジタルポスティング */}
        <section className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="bg-slate-800 h-4 mx-12 mt-8 rounded-full shadow-inner opacity-40"></div>
          <div className="p-8">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">Digital Post</h2>
            {notices.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-900 leading-tight">{notices[0].title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-[2rem]">{notices[0].content}</p>
              </div>
            ) : (
              <p className="text-center text-slate-400 text-xs italic py-10">現在、新しい投函物はありません</p>
            )}
          </div>
        </section>

        {/* 近隣店舗広告 */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">近隣の店舗情報</h2>
          <div className="grid grid-cols-1 gap-4">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-white p-6 rounded-[2.5rem] shadow-md flex items-center gap-6 active:scale-[0.98] transition-all">
                <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center text-3xl">{ad.emoji}</div>
                <div className="flex-1">
                  <p className="text-[9px] font-black text-amber-600 mb-1">{ad.discount}</p>
                  <h4 className="text-sm font-black text-slate-800">{ad.shop}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ナビゲーション */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl flex items-center justify-around px-8 border border-white/10 z-50">
        <Link href="/resident/dashboard" className="flex flex-col items-center gap-1">
          <span className="text-2xl">📢</span>
          <span className="text-[7px] font-black uppercase text-blue-500">掲示板</span>
        </Link>
        <Link href="/resident/settings" className="flex flex-col items-center gap-1 opacity-40">
          <span className="text-2xl">🔧</span>
          <span className="text-[7px] font-black uppercase text-white">設定</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center gap-1 opacity-40">
          <span className="text-2xl">👤</span>
          <span className="text-[7px] font-black uppercase text-white">終了</span>
        </Link>
      </nav>
    </div>
  );
}