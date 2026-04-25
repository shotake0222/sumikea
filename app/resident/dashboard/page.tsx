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
  const [trashSchedules, setTrashSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [garbageCalendars, setGarbageCalendars] = useState<any>({}); 
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchResidentData();
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

      const role = (prof?.role || 'USER').toUpperCase();

      if (role === 'USER' && !prof?.property_id) {
        window.location.href = '/resident/setup';
        return;
      }

      setProfile(prof);
      setGarbageCalendars(prof?.monthly_garbage_calendars || {});

      if (prof?.property_id) {
        const { data: rawNotices } = await supabase
          .from('property_notifications')
          .select('*')
          .eq('property_id', prof.property_id)
          .order('created_at', { ascending: false });
        setNotices(rawNotices || []);

        const { data: trashData } = await supabase
          .from('trash_schedules')
          .select('*')
          .eq('property_id', prof.property_id);
        setTrashSchedules(trashData || []);
      }

      // 近隣店舗ダミーデータ（日本語化）
      setAds([
        { id: 1, shop: "駅前スーパー ぽすっと店", title: "タイムセール開催中！", discount: "10% OFF", emoji: "🍎" },
        { id: 2, shop: "クリーニング 24", title: "衣替えキャンペーン", discount: "1点無料", emoji: "👔" }
      ]);

    } catch (err) {
      console.error('致命的な取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTodayTrash = () => {
    const dayMap = ["日", "月", "火", "水", "木", "金", "土"];
    const todayStr = dayMap[new Date().getDay()];
    return trashSchedules.filter(item => item.day_of_week === todayStr);
  };

  const todayTrash = getTodayTrash();

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

      const updatedCalendars = { ...garbageCalendars, [selectedMonth]: publicUrl };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ monthly_garbage_calendars: updatedCalendars })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setGarbageCalendars(updatedCalendars);
      alert(`${selectedMonth}月のカレンダーを保存しました`);
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
    <div className="max-w-md mx-auto bg-[#F8FAFC] min-h-screen pb-40 font-sans overflow-x-hidden relative">
      
      {/* ヘッダーセクション */}
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
        <div className="absolute right-[-5%] top-[-10%] w-56 h-56 bg-blue-600 rounded-full opacity-20 blur-[80px]"></div>
      </div>

      <div className="p-5 space-y-8 -mt-6 relative z-20">
        
        {/* ゴミ出しスケジュール & カレンダー表示 */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">ゴミ出しスケジュール</h2>
            {/* 月選択ボタンのラップ解消（折り返し許可） */}
            <div className="flex flex-wrap gap-1.5">
              {[...Array(12)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setSelectedMonth(i + 1)}
                  className={`w-8 h-8 rounded-lg font-black text-[10px] transition-all border shrink-0
                    ${selectedMonth === i + 1 ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-300 border-slate-100'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200 border border-white">
            {/* 今日のゴミチップ */}
            <div className="bg-emerald-500 p-4 text-white flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">今日のゴミ収集</span>
              <span className="text-sm font-black italic">
                {todayTrash.length > 0 ? todayTrash.map(t => t.trash_type).join('・') : '収集なし'}
              </span>
            </div>

            {/* カレンダー本体 */}
            <div className="p-3 min-h-[220px] flex items-center justify-center bg-slate-50 relative">
              {garbageCalendars[selectedMonth] ? (
                <div className="w-full">
                  {garbageCalendars[selectedMonth].toLowerCase().endsWith('.pdf') ? (
                    <iframe 
                      src={garbageCalendars[selectedMonth]} 
                      className="w-full h-[350px] border-none rounded-xl"
                      title="ゴミ出しカレンダーPDF"
                    />
                  ) : (
                    <img 
                      src={garbageCalendars[selectedMonth]} 
                      alt={`${selectedMonth}月カレンダー`} 
                      className="w-full h-auto object-contain rounded-xl shadow-sm"
                      onClick={() => window.open(garbageCalendars[selectedMonth], '_blank')}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center p-8">
                  <div className="text-3xl mb-2 opacity-20">📅</div>
                  <p className="text-[11px] font-black text-slate-400 italic">{selectedMonth}月のカレンダーは未登録です</p>
                  <p className="text-[9px] text-slate-300 mt-1 uppercase tracking-tighter">下の「表登録」ボタンから画像を追加できます</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* デジタル掲示板 */}
        <section className="bg-white rounded-[3rem] shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="bg-slate-800 h-1.5 mx-auto mt-6 w-16 rounded-full opacity-10"></div>
          <div className="p-8">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center italic">デジタル掲示板</h2>
            {notices.length > 0 ? (
              <div className="space-y-4">
                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-full uppercase">最新の通知</div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{notices[0].title}</h3>
                <p className="text-[13px] text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-[1.5rem] whitespace-pre-wrap border border-slate-100">
                  {notices[0].content}
                </p>
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-slate-300 text-xs italic font-bold uppercase tracking-widest">新しい通知はありません</p>
              </div>
            )}
          </div>
        </section>

        {/* 近隣店舗（デジタルチラシ） */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 italic">近隣のお得な情報</h2>
          <div className="grid grid-cols-1 gap-3">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 flex items-center gap-5 active:scale-[0.98] transition-all">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-xl shrink-0">{ad.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-amber-600 uppercase mb-0.5 tracking-wider">{ad.discount}</p>
                  <h4 className="text-sm font-black text-slate-800 truncate">{ad.shop}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{ad.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* フローティング・ボトムナビゲーション */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-50">
        <nav className="max-w-sm mx-auto h-20 bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl flex items-center justify-around px-4 border border-white/10">
          <Link href="/resident/dashboard" className="flex flex-col items-center gap-1 group">
            <span className="text-2xl group-active:scale-110 transition-transform">📢</span>
            <span className="text-[8px] font-black uppercase text-blue-500 tracking-widest">掲示板</span>
          </Link>
          
          <label className="flex flex-col items-center gap-1 cursor-pointer group">
            <span className="text-2xl group-active:scale-110 transition-transform">{uploading ? '⏳' : '📅'}</span>
            <span className="text-[8px] font-black uppercase text-white tracking-widest opacity-60">表登録</span>
            <input type="file" className="hidden" onChange={handleCalendarUpload} accept="image/*,application/pdf" disabled={uploading} />
          </label>

          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }} 
            className="flex flex-col items-center gap-1 opacity-60 group"
          >
            <span className="text-2xl group-active:scale-110 transition-transform">👤</span>
            <span className="text-[8px] font-black uppercase text-white tracking-widest">終了</span>
          </button>
        </nav>
      </div>

      <footer className="mt-8 pb-32 text-[8px] text-slate-300 text-center font-bold uppercase tracking-[0.4em]">
        Posutto 居住者専用ポータル v2.9
      </footer>
    </div>
  );
}