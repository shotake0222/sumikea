'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResidentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  
  // 各セクションのデータ
  const [postingNotices, setPostingNotices] = useState<any[]>([]); // ぽすっと（最優先）
  const [notices, setNotices] = useState<any[]>([]);               // 管理組合（次点）
  const [trashSchedules, setTrashSchedules] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(true);
  
  // ゴミカレンダー管理用（YYYY-MM形式で年跨ぎ対応）
  const [garbageCalendars, setGarbageCalendars] = useState<any>({}); 
  const [selectedYearMonth, setSelectedYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [garbageContact, setGarbageContact] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isEditingCalendar, setIsEditingCalendar] = useState(false);

  // 計測用
  const viewStartTime = useRef<number | null>(null);
  const impressionTracked = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchResidentData();
    return () => { handleTrackDuration(); };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notification_reads')
        .upsert(
          { notification_id: notificationId, user_id: user.id },
          { onConflict: 'notification_id, user_id' }
        );
    } catch (err) {
      console.error('既読処理エラー:', err);
    }
  };

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
      setGarbageContact(prof?.garbage_contact_info || '');

      if (prof?.property_id) {
        // 1. ぽすっとセクション (最優先表示)
        const { data: rawPosting } = await supabase
          .from('property_notifications')
          .select('*')
          .eq('property_id', prof.property_id)
          .eq('category', 'posting') 
          .order('created_at', { ascending: false })
          .limit(1);
        
        setPostingNotices(rawPosting || []);
        if (rawPosting && rawPosting.length > 0) markAsRead(rawPosting[0].id);

        // 2. 通常の物件掲示板
        const { data: rawNotices } = await supabase
          .from('property_notifications')
          .select('*')
          .eq('property_id', prof.property_id)
          .neq('category', 'posting') // ぽすっと以外
          .order('created_at', { ascending: false });
        
        setNotices(rawNotices || []);
        if (rawNotices && rawNotices.length > 0) markAsRead(rawNotices[0].id);

        // 3. ゴミスケ
        const { data: trashData } = await supabase
          .from('trash_schedules')
          .select('*')
          .eq('property_id', prof.property_id);
        setTrashSchedules(trashData || []);

        // 4. デジタルチラシ
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

  // 月別カレンダーのアップロード
  const handleCalendarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      // ファイルパスに YYYY-MM を含める
      const filePath = `garbage/${user?.id}/${selectedYearMonth}_${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('user_documents').upload(filePath, file);
      
      const { data: { publicUrl } } = supabase.storage.from('user_documents').getPublicUrl(filePath);
      
      const updatedCalendars = { ...garbageCalendars, [selectedYearMonth]: publicUrl };
      await supabase.from('profiles').update({ monthly_garbage_calendars: updatedCalendars }).eq('id', user?.id);
      
      setGarbageCalendars(updatedCalendars);
      alert(`${selectedYearMonth}のカレンダーを登録しました`);
    } catch (err) {
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // 問い合わせ先の保存
  const saveContactInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('profiles').update({ garbage_contact_info: garbageContact }).eq('id', user?.id);
    } catch (err) {
      console.error('連絡先保存エラー');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-[#F8FAFC] min-h-screen pb-40 font-sans overflow-x-hidden relative">
      
      {/* 改善: ヘッダー色を黒から爽やかなブルーグラデーションに変更 */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-8 pt-12 rounded-b-[3.5rem] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-10 translate-x-10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse shadow-[0_0_8px_rgba(110,231,183,0.8)]"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
              {profile?.properties?.name || '物件ポータル'}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter italic drop-shadow-md">
             {profile?.room_number ? `${profile.room_number}号室` : 'マイページ'}
          </h1>
        </div>
      </div>

      <div className="p-5 space-y-8 -mt-6 relative z-20">
        
        {/* 順番変更 1: ぽすっとセクション（最重要） */}
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

        {/* 順番変更 2: デジタル掲示板（管理組合） */}
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

        {/* 順番変更 3: ゴミ出し＆カレンダー機能強化 */}
        <section className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200 border border-white">
          <div className="bg-emerald-500 p-4 text-white flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-90">今日のゴミ収集</span>
            <span className="text-sm font-black italic drop-shadow-sm">
              {getTodayTrash().length > 0 ? getTodayTrash().map(t => t.trash_type).join('・') : '収集なし'}
            </span>
          </div>
          
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            {/* 年月ピッカー（年跨ぎ対応） */}
            <input 
              type="month" 
              value={selectedYearMonth}
              onChange={(e) => setSelectedYearMonth(e.target.value)}
              className="bg-transparent text-sm font-black text-slate-700 outline-none cursor-pointer"
            />
            <button 
              onClick={() => setIsEditingCalendar(!isEditingCalendar)}
              className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full"
            >
              {isEditingCalendar ? '完了' : '設定'}
            </button>
          </div>

          {/* カレンダー表示エリア */}
          <div className="p-3 min-h-[180px] flex items-center justify-center bg-white relative">
            {garbageCalendars[selectedYearMonth] ? (
              <img src={garbageCalendars[selectedYearMonth]} alt="ゴミカレンダー" className="w-full h-auto rounded-xl shadow-sm cursor-pointer" onClick={() => window.open(garbageCalendars[selectedYearMonth], '_blank')} />
            ) : (
              <p className="text-[11px] font-black text-slate-400 italic">この月のカレンダーは未登録です</p>
            )}
          </div>

          {/* カレンダー登録・編集UI (親切な設計) */}
          {isEditingCalendar && (
            <div className="p-5 bg-slate-100 border-t border-slate-200 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🗓 {selectedYearMonth} の画像を登録</label>
                <div className="relative">
                  <input type="file" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" onChange={handleCalendarUpload} accept="image/*" disabled={uploading} />
                  {uploading && <span className="absolute right-2 top-2 text-xs font-bold text-blue-600">送信中...</span>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">📞 粗大ゴミなどの問い合わせ先</label>
                <input 
                  type="text" 
                  value={garbageContact}
                  onChange={(e) => setGarbageContact(e.target.value)}
                  onBlur={saveContactInfo}
                  placeholder="例: 粗大ゴミ受付センター 000-000-0000"
                  className="w-full bg-white border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          )}
          
          {/* 閲覧モード時でも連絡先が登録されていれば表示 */}
          {!isEditingCalendar && garbageContact && (
            <div className="px-5 pb-5 bg-white">
              <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3 border border-slate-100">
                <span className="text-lg">📞</span>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">問い合わせ先</p>
                  <p className="text-xs font-black text-slate-700">{garbageContact}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 順番変更 4: デジタルチラシ */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 italic">近隣のお得な情報</h2>
          <div className="grid grid-cols-1 gap-3">
            {ads.length > 0 ? ads.map((ad) => (
              <div 
                key={ad.id} 
                onClick={() => handleAdInteraction(ad.id, ad.pdf_url)}
                className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 flex items-center gap-5 active:scale-[0.98] transition-all cursor-pointer hover:border-blue-100 hover:shadow-md"
              >
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-xl shrink-0">
                  {ad.target_metadata?.emoji || '🏷️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-amber-600 uppercase mb-0.5 tracking-wider">{ad.target_metadata?.discount || 'SALE'}</p>
                  <h4 className="text-sm font-black text-slate-800 truncate">{ad.title}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{ad.content || '詳細はこちら'}</p>
                </div>
                <div className="text-slate-300 font-black">→</div>
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
            <span className="text-[8px] font-black uppercase text-blue-500 tracking-widest">ホーム</span>
          </Link>
          <Link href="/resident/settings" className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <span className="text-2xl">⚙️</span>
            <span className="text-[8px] font-black uppercase text-white tracking-widest">設定</span>
          </Link>
          <button onClick={() => { supabase.auth.signOut(); window.location.href = '/login'; }} className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <span className="text-2xl">🚪</span>
            <span className="text-[8px] font-black uppercase text-white tracking-widest">ログアウト</span>
          </button>
        </nav>
      </div>
    </div>
  );
}