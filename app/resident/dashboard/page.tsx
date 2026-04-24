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
  const [trashSchedules, setTrashSchedules] = useState<any[]>([]); // ステップ3用
  const [loading, setLoading] = useState(true);
  
  // 画像アップロード形式用ステート
  const [garbageCalendars, setGarbageCalendars] = useState<any>({}); 
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [uploading, setUploading] = useState(false);

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

      // 修正: メールアドレスによる強制リダイレクトを削除しました。
      // これによりループが解消され、以下の「物件IDがない場合のみ」の判定が正しく機能します。

      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*, properties(*)')
        .eq('id', user.id)
        .single();

      // 物件IDが未登録（初回ログイン時やDBリセット時）のみセットアップへ
      if (profError || !prof?.property_id) {
        router.push('/resident/setup');
        return;
      }

      setProfile(prof);
      setGarbageCalendars(prof.monthly_garbage_calendars || {});

      // 1. 掲示板データの取得
      const { data: rawNotices } = await supabase
        .from('property_notifications')
        .select('*')
        .eq('property_id', prof.property_id);

      setNotices(rawNotices || []);

      // 2. 近隣店舗広告
      setAds([
        { id: 1, shop: "駅前スーパー ぽすっと店", title: "タイムセール開催中！", discount: "10% OFF", emoji: "🍎" },
        { id: 2, shop: "クリーニング 24", title: "衣替えキャンペーン", discount: "1点無料", emoji: "👔" }
      ]);

      // 3. 今日のゴミ出し用テキストデータの取得
      const { data: trashData } = await supabase
        .from('trash_schedules')
        .select('*')
        .eq('property_id', prof.property_id);
      
      setTrashSchedules(trashData || []);

    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 今日のゴミ出しを判定するヘルパー
  const getTodayTrash = () => {
    const dayMap = ["日", "月", "火", "水", "木", "金", "土"];
    const todayStr = dayMap[new Date().getDay()];
    return trashSchedules.filter(item => item.day_of_week === todayStr);
  };

  const todayTrash = getTodayTrash();

  // 画像アップロード処理
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
        
        {/* 【ステップ3】今日のゴミ出し（テキスト形式） */}
        <section className="relative">
          <div className="flex justify-between items-end px-2 mb-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Today's Trash</h2>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-6 shadow-xl text-white flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl">
              {todayTrash.length > 0 ? "🚮" : "🍃"}
            </div>
            <div>
              <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">
                {new Date().toLocaleDateString('ja-JP', { weekday: 'long' })}
              </p>
              <h3 className="text-xl font-black italic">
                {todayTrash.length > 0 
                  ? todayTrash.map(t => t.trash_type).join('・') 
                  : '本日の収集はありません'}
              </h3>
            </div>
          </div>
        </section>

        {/* ゴミカレンダー画像表示エリア */}
        <section className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200 border border-white">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Full Calendar</h2>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{selectedMonth}月分</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
            {[...Array(12)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setSelectedMonth(i + 1)}
                className={`flex-shrink-0 w-11 h-11 rounded-xl font-black text-xs transition-all border-2 
                  ${selectedMonth === i + 1 ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-300 border-slate-100'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-[2rem] overflow-hidden border-2 border-slate-100 bg-slate-50 min-h-[200px] flex items-center justify-center">
            {garbageCalendars[selectedMonth] ? (
              <img 
                src={garbageCalendars[selectedMonth]} 
                alt="ゴミカレンダー" 
                className="w-full h-auto object-contain cursor-pointer"
                onClick={() => window.open(garbageCalendars[selectedMonth], '_blank')}
              />
            ) : (
              <p className="text-[11px] font-black text-slate-400 italic p-10">カレンダー未登録</p>
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

        {/* 店舗情報 */}
        <section className="space-y-4 pb-10">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 italic">Neighborhood</h2>
          <div className="grid grid-cols-1 gap-4">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 flex items-center gap-6">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl">{ad.emoji}</div>
                <div className="flex-1 text-sm font-black text-slate-800">{ad.shop}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ナビゲーション */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl flex items-center justify-around px-8 border border-white/10 z-50">
        <Link href="/resident/dashboard" className="flex flex-col items-center gap-1">
          <span className="text-2xl">📢</span>
          <span className="text-[7px] font-black uppercase text-blue-500 tracking-widest">掲示板</span>
        </Link>
        
        <label className="flex flex-col items-center gap-1 cursor-pointer">
          <span className="text-2xl">{uploading ? '⏳' : '📅'}</span>
          <span className="text-[7px] font-black uppercase text-white tracking-widest opacity-40">表登録</span>
          <input type="file" className="hidden" onChange={handleCalendarUpload} accept="image/*,application/pdf" disabled={uploading} />
        </label>

        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="flex flex-col items-center gap-1 opacity-40">
          <span className="text-2xl">👤</span>
          <span className="text-[7px] font-black uppercase text-white tracking-widest">ログアウト</span>
        </button>
      </nav>
    </div>
  );
}