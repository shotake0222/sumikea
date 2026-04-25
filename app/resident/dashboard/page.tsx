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
  
  // ゴミカレンダー（画像・PDF）管理用
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

      if (profError) console.error('DB Fetch Error:', profError);

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

      setAds([
        { id: 1, shop: "駅前スーパー ぽすっと店", title: "タイムセール開催中！", discount: "10% OFF", emoji: "🍎" },
        { id: 2, shop: "クリーニング 24", title: "衣替えキャンペーン", discount: "1点無料", emoji: "👔" }
      ]);

    } catch (err) {
      console.error('Critical fetch error:', err);
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
    <div className="max-w-md mx-auto bg-[#F8FAFC] min-h-screen pb-40 font-sans overflow-x-hidden">
      
      {/* ヘッダー */}
      <div className="bg-slate-900 p-10 rounded-b-[3.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {profile?.properties?.name || 'Portal View'}
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter italic">
             {profile?.room_number ? `${profile.room_number}号室` : 'マイページ'}
          </h1>
        </div>
        <div className="absolute right-[-5%] top-[-10%] w-56 h-56 bg-blue-600 rounded-full opacity-20 blur-[80px]"></div>
      </div>

      <div className="p-6 space-y-10 -mt-8 relative z-20">
        
        {/* 今日のゴミ出し & カレンダー表示 */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Garbage Schedule</h2>
            <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[200px]">
              {[...Array(12)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setSelectedMonth(i + 1)}
                  className={`flex-shrink-0 w-8 h-8 rounded-lg font-black text-[9px] transition-all border 
                    ${selectedMonth === i + 1 ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-300 border-slate-100'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* 曜日表示を削除し、カレンダーの中身をメインに表示 */}
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200 border border-white">
            {/* 今日のゴミ種類だけを上部にチップで表示 */}
            <div className="bg-emerald-500 p-4 text-white flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest">Today's Trash</span>
              <span className="text-sm font-black italic">
                {todayTrash.length > 0 ? todayTrash.map(t => t.trash_type).join('・') : '収集なし'}
              </span>
            </div>

            <div className="p-2 min-h-[250px] flex items-center justify-center bg-slate-50 relative">
              {garbageCalendars[selectedMonth] ? (
                <div className="w-full">
                  {garbageCalendars[selectedMonth].toLowerCase().endsWith('.pdf') ? (
                    <iframe 
                      src={garbageCalendars[selectedMonth]} 
                      className="w-full h-[350px] border-none rounded-xl"
                      title="PDF Calendar"
                    />
                  ) : (
                    <img 
                      src={garbageCalendars[selectedMonth]} 
                      alt={`${selectedMonth}月カレンダー`} 
                      className="w-full h-auto object-contain rounded-xl"
                      onClick={() => window.open(garbageCalendars[selectedMonth], '_blank')}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center p-10">
                  <div className="text-3xl mb-2 opacity-20">📅</div>
                  <p className="text-[11px] font-black text-slate-400 italic">{selectedMonth}月のカレンダー未登録</p>
                  <p className="text-[9px] text-slate-300 mt-1 uppercase tracking-tighter">下の「表登録」ボタンから画像を追加してください</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 掲示板 */}
        <section className="bg-white rounded-[3rem] shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="bg-slate-800 h-4 mx-12 mt-8 rounded-full shadow-inner opacity-40"></div>
          <div className="p-8">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center italic">Digital Post</h2>
            {notices.length > 0 ? (
              <div className="space-y-6">
                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-full uppercase">Recent Notice</div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{notices[0].title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-[2rem] whitespace-pre-wrap">{notices[0].content}</p>
              </div>
            ) : (
              <p className="text-center text-slate-400 text-xs italic py-10 font-bold uppercase tracking-widest">No New Post</p>
            )}
          </div>
        </section>

        {/* 近隣店舗 */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 italic">Neighborhood</h2>
          <div className="grid grid-cols-1 gap-4">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 flex items-center gap-6 active:scale-[0.98] transition-transform">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl">{ad.emoji}</div>
                <div>
                  <p className="text-[9px] font-black text-amber-600 uppercase mb-0.5">{ad.discount}</p>
                  <h4 className="text-sm font-black text-slate-800">{ad.shop}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ボトムナビゲーション */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl flex items-center justify-around px-8 border border-white/10 z-50">
        <Link href="/resident/dashboard" className="flex flex-col items-center gap-1 group">
          <span className="text-2xl group-active:scale-110 transition-transform">📢</span>
          <span className="text-[7px] font-black uppercase text-blue-500 tracking-widest">掲示板</span>
        </Link>
        
        <label className="flex flex-col items-center gap-1 cursor-pointer group">
          <span className="text-2xl group-active:scale-110 transition-transform">{uploading ? '⏳' : '📅'}</span>
          <span className="text-[7px] font-black uppercase text-white tracking-widest opacity-40">表登録</span>
          <input type="file" className="hidden" onChange={handleCalendarUpload} accept="image/*,application/pdf" disabled={uploading} />
        </label>

        <button 
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }} 
          className="flex flex-col items-center gap-1 opacity-40 group"
        >
          <span className="text-2xl group-active:scale-110 transition-transform">👤</span>
          <span className="text-[7px] font-black uppercase text-white tracking-widest">終了</span>
        </button>
      </nav>

      <footer className="mt-4 pb-12 text-[8px] text-slate-300 text-center font-bold uppercase tracking-[0.4em]">
        Posutto v2.9
      </footer>
    </div>
  );
}