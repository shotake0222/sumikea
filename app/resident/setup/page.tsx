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
  const [garbageCalendars, setGarbageCalendars] = useState<any>({}); 

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

      // プロフィール取得（カラム名を明示的に指定）
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
      
      // 重要：データが入っているかログで確認（ブラウザのコンソールで見れます）
      console.log("取得したプロフィール:", prof);
      
      // JSONBカラムから月別データを復元（カラム名が正確か確認してください）
      const savedCalendars = prof.monthly_garbage_calendars || {};
      setGarbageCalendars(savedCalendars);

      // 通知取得（エラー回避のため個別に取得）
      const { data: rawNotices } = await supabase
        .from('property_notifications')
        .select('*')
        .eq('property_id', prof.property_id);

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

  const handleCalendarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `garbage/${user.id}/${selectedMonth}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user_documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user_documents')
        .getPublicUrl(filePath);

      // 現在のリストに新しいURLを追加
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
        
        {/* 【ここがカレンダーUI】 */}
        <section className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200 border border-white">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">My Calendar</h2>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">ゴミ収集表</span>
          </div>

          {/* 月選択タブ */}
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => {
              const isRegistered = !!garbageCalendars[m];
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`flex-shrink-0 w-11 h-11 rounded-xl font-black text-xs transition-all border-2 
                    ${selectedMonth === m ? 'bg-slate-900 text-white border-slate-900' : 
                      isRegistered ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-300 border-slate-100'}`}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* コンテンツエリア */}
          <div className="mt-4 p-5 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
            {garbageCalendars[selectedMonth] ? (
              <div className="space-y-4 text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {selectedMonth}月分 登録済み
                </div>
                <a 
                  href={garbageCalendars[selectedMonth]} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block w-full bg-slate-900 text-white text-[11px] font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-transform"
                >
                  カレンダーを表示する
                </a>
                <label className="inline-block text-[10px] font-bold text-blue-500 cursor-pointer hover:underline">
                  別の画像に変更
                  <input type="file" className="hidden" onChange={handleCalendarUpload} accept="image/*,application/pdf" />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center py-6 cursor-pointer group">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-active:scale-90 transition-transform">
                  <span className="text-2xl">{uploading ? '⏳' : '📤'}</span>
                </div>
                <span className="text-[11px] font-black text-slate-500 tracking-tighter">
                  {uploading ? 'アップロード中...' : `${selectedMonth}月のカレンダーをアップ`}
                </span>
                <input type="file" className="hidden" onChange={handleCalendarUpload} accept="image/*,application/pdf" disabled={uploading} />
              </label>
            )}
          </div>
        </section>

        {/* 掲示板 */}
        <section className="bg-white rounded-[3rem] shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="bg-slate-800 h-4 mx-12 mt-8 rounded-full shadow-inner opacity-40"></div>
          <div className="p-8">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center italic">Digital Post</h2>
            {notices.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-900 leading-tight">{notices[0].title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-[2rem]">{notices[0].content}</p>
              </div>
            ) : (
              <p className="text-center text-slate-400 text-xs italic py-10">新しいお知らせはありません</p>
            )}
          </div>
        </section>

        {/* 近隣店舗広告 */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 italic">Neighborhood</h2>
          <div className="grid grid-cols-1 gap-4">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm flex items-center gap-6 active:scale-[0.98] transition-all border border-slate-50">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl">{ad.emoji}</div>
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
        <Link href="/resident/dashboard" className="flex flex-col items-center gap-1 group">
          <span className="text-2xl group-active:scale-110 transition-transform">📢</span>
          <span className="text-[7px] font-black uppercase text-blue-500 tracking-widest">掲示板</span>
        </Link>
        <Link href="/resident/settings" className="flex flex-col items-center gap-1 opacity-40">
          <span className="text-2xl">🔧</span>
          <span className="text-[7px] font-black uppercase text-white tracking-widest">設定</span>
        </Link>
        <Link href="/login" className="flex flex-col items-center gap-1 opacity-40">
          <span className="text-2xl">👤</span>
          <span className="text-[7px] font-black uppercase text-white tracking-widest">終了</span>
        </Link>
      </nav>

      <footer className="mt-4 pb-12 text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
        Posutto Resident Dashboard v2.6
      </footer>
    </div>
  );
}