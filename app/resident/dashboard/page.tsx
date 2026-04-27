'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResidentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  
  // セグメント分けされたお知らせ・チラシ
  const [priorityPost, setPriorityPost] = useState<any>(null); // デジタル投函（チラシ）をここに統合
  const [notices, setNotices] = useState<any[]>([]);           // 管理会社からのお知らせ
  const [ads, setAds] = useState<any[]>([]);                  // 純粋な外部広告（必要に応じて）
  
  const [loading, setLoading] = useState(true);
  
  const [garbageCalendars, setGarbageCalendars] = useState<any>({}); 
  const [selectedYearMonth, setSelectedYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [garbageContact, setGarbageContact] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isEditingCalendar, setIsEditingCalendar] = useState(false);

  const [targetLang, setTargetLang] = useState('ja');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedPriority, setTranslatedPriority] = useState<any>(null);
  const [translatedNotices, setTranslatedNotices] = useState<any[]>([]);

  const viewStartTime = useRef<number | null>(null);
  const impressionTracked = useRef<Set<string>>(new Set());

  const uiTexts: any = {
    ja: {
      room: '号室', mypage: 'マイページ', postTitle: '重要ポスト', noPost: '新しいお知らせを待機中...',
      boardTitle: 'デジタル掲示板', noBoard: '現在、掲示物はありません', 
      trashTitle: 'ゴミ収集カレンダー', 
      trashHint: 'お手持ちのゴミカレンダーを撮影してアップロードすると、いつでもここから確認できて便利です！',
      calendarNotSet: 'カレンダーがまだ登録されていません', set: '写真を登録する', complete: '保存完了',
      uploadText: 'の画像を登録', contactText: '粗大ゴミ等の問い合わせ先', sending: '送信中...',
      adsTitle: '近隣のトピックス', noAds: '周辺のお得な情報を探索中...', home: 'ホーム', settings: '設定', logout: 'ログアウト',
      langLabel: 'TRANSLATE / 多言語表示'
    },
    en: {
      room: ' Room', mypage: 'My Page', postTitle: 'PRIORITY POST', noPost: 'Waiting for updates...',
      boardTitle: 'BULLETIN BOARD', noBoard: 'No notices at the moment.', 
      trashTitle: 'TRASH CALENDAR', 
      trashHint: 'Upload a photo of your local trash calendar to check it anytime here!',
      calendarNotSet: 'No calendar registered yet', set: 'Upload Photo', complete: 'Done',
      uploadText: ' Upload Image', contactText: 'Trash Contact Info', sending: 'Sending...',
      adsTitle: 'LOCAL TOPICS', noAds: 'Exploring local deals...', home: 'Home', settings: 'Settings', logout: 'Logout',
      langLabel: 'TRANSLATE'
    }
  };
  const t = uiTexts[targetLang] || uiTexts.ja;

  useEffect(() => {
    fetchResidentData();
    return () => { handleTrackDuration(); };
  }, []);

  // 翻訳ロジック
  useEffect(() => {
    const doTranslate = async () => {
      if (targetLang === 'ja') {
        setTranslatedPriority(priorityPost);
        setTranslatedNotices(notices);
        return;
      }
      setIsTranslating(true);
      const translateText = async (text: string) => {
        if (!text) return '';
        try {
          const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
          const data = await res.json();
          return data[0].map((item: any) => item[0]).join('');
        } catch (err) { return text; }
      };

      if (priorityPost) {
        setTranslatedPriority({
          ...priorityPost,
          title: await translateText(priorityPost.title),
          content: await translateText(priorityPost.content)
        });
      }

      const transNotices = await Promise.all(notices.map(async (n) => ({
        ...n, title: await translateText(n.title), content: await translateText(n.content)
      })));
      setTranslatedNotices(transNotices);
      setIsTranslating(false);
    };
    doTranslate();
  }, [targetLang, priorityPost, notices]);

  const fetchResidentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login?type=user'; return; }
      
      const { data: prof } = await supabase.from('profiles').select('*, properties(*)').eq('id', user.id).single();
      if (prof?.role === 'USER' && !prof?.property_id) { window.location.href = '/resident/setup'; return; }
      
      setProfile(prof);
      setGarbageCalendars(prof?.monthly_garbage_calendars || {});
      setGarbageContact(prof?.garbage_contact_info || '');

      if (prof?.property_id) {
        // 1. デジタル投函（チラシ）を「重要ポスト」として取得
        const { data: flyers } = await supabase
          .from('digital_flyers')
          .select('*')
          .eq('property_id', prof.property_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (flyers && flyers.length > 0) {
          setPriorityPost(flyers[0]);
          // インプレッション計測
          if (!impressionTracked.current.has(flyers[0].id)) {
            supabase.rpc('increment_ad_views', { target_ad_id: flyers[0].id });
            impressionTracked.current.add(flyers[0].id);
          }
        }

        // 2. 管理会社からの掲示板（categoryがposting以外）を取得
        const { data: rawNotices } = await supabase
          .from('property_notifications')
          .select('*')
          .eq('property_id', prof.property_id)
          .order('created_at', { ascending: false });
        
        setNotices(rawNotices || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleTrackDuration = async (adId?: string) => {
    if (viewStartTime.current && adId) {
      const duration = Math.round((Date.now() - viewStartTime.current) / 1000);
      if (duration > 0) await supabase.rpc('add_ad_duration', { target_ad_id: adId, duration_seconds: duration });
      viewStartTime.current = null;
    }
  };

  // 🎯 PDF表示ギミックの修正
  const handleAdInteraction = async (ad: any) => {
    if (!ad) return;
    
    viewStartTime.current = Date.now();
    // クリック数カウント
    await supabase.rpc('increment_ad_clicks', { target_ad_id: ad.id });

    // pdf_url がカンマ区切りの文字列である場合を考慮して解析
    const urlString = ad.pdf_url || '';
    const urls = urlString.split(',').map((u: string) => u.trim()).filter((u: string) => u.length > 0);
    
    if (urls.length > 0) {
      window.open(urls[0], '_blank');
    } else {
      alert('詳細を準備中です');
    }
  };

  const handleCalendarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `garbage/${user?.id}/${selectedYearMonth}_${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('user_documents').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('user_documents').getPublicUrl(filePath);
      const updatedCalendars = { ...garbageCalendars, [selectedYearMonth]: publicUrl };
      await supabase.from('profiles').update({ monthly_garbage_calendars: updatedCalendars }).eq('id', user?.id);
      setGarbageCalendars(updatedCalendars);
      setIsEditingCalendar(false);
      alert(`${selectedYearMonth} のカレンダーを更新しました`);
    } catch (err) { alert('アップロード失敗'); } finally { setUploading(false); }
  };

  const saveContactInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles').update({ garbage_contact_info: garbageContact }).eq('id', user?.id);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading Resident Data...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-[#F4F7FA] min-h-screen pb-44 font-sans overflow-x-hidden relative">
      
      {/* 🌟 Immersive Header */}
      <div className="relative bg-slate-900 pt-16 pb-20 px-8 rounded-b-[4.5rem] shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-600 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-indigo-600 rounded-full blur-[80px]"></div>
        </div>

        <div className="relative z-10 text-center">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">
                {profile?.properties?.name || 'Smart Resident Portal'}
            </p>
            <h1 className="text-4xl font-black text-white italic tracking-tighter drop-shadow-xl mb-8">
                 {profile?.room_number ? `${profile.room_number}${t.room}` : t.mypage}
            </h1>

            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-5 rounded-[2.5rem] shadow-2xl">
                <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{t.langLabel}</span>
                {isTranslating && <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>}
                </div>
                <div className="grid grid-cols-4 gap-3">
                {[{ id: 'ja', flag: '🇯🇵', label: 'JP' }, { id: 'en', flag: '🇺🇸', label: 'EN' }, { id: 'zh', flag: '🇨🇳', label: 'CN' }, { id: 'vi', flag: '🇻🇳', label: 'VN' }].map(lang => (
                    <button key={lang.id} onClick={() => setTargetLang(lang.id)}
                    className={`py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all ${targetLang === lang.id ? 'bg-white shadow-xl scale-105' : 'bg-white/5 hover:bg-white/10'}`}>
                    <span className={`text-2xl ${targetLang === lang.id ? '' : 'grayscale opacity-60'}`}>{lang.flag}</span>
                    <span className={`text-[8px] font-black ${targetLang === lang.id ? 'text-slate-900' : 'text-white/40'}`}>{lang.label}</span>
                    </button>
                ))}
                </div>
            </div>
        </div>
      </div>

      <div className="px-6 space-y-10 -mt-8 relative z-20">
        
        {/* 1. 重要ポスト（デジタル投函チラシをここに表示） */}
        <section 
            onClick={() => priorityPost && handleAdInteraction(priorityPost)}
            className="bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-800 overflow-hidden text-white relative group cursor-pointer active:scale-95 transition-transform"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl group-hover:scale-110 transition-transform">📬</div>
          <div className="p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
              <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">{t.postTitle}</h2>
            </div>
            
            {translatedPriority ? (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
                <span className="text-[9px] font-black bg-blue-600 px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">New Digital Flyer</span>
                <h3 className="text-2xl font-black leading-tight mb-4 italic tracking-tight text-white underline decoration-blue-500/50 underline-offset-8">
                    {translatedPriority.title}
                </h3>
                <p className="text-[14px] text-slate-300 leading-relaxed font-medium bg-white/5 p-6 rounded-3xl border border-white/5 line-clamp-3">
                    {translatedPriority.content}
                </p>
                <div className="mt-6 flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-widest">
                    <span>Tap to view PDF flyer</span>
                    <span className="animate-bounce">→</span>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center gap-4 border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-white/2">
                <span className="text-4xl opacity-20">📭</span>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t.noPost}</p>
              </div>
            )}
          </div>
        </section>

        {/* 2. デジタル掲示板（管理会社からのお知らせ） */}
        <section className="bg-white rounded-[3.5rem] shadow-xl shadow-slate-200 border border-white overflow-hidden">
          <div className="p-10">
            <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-8 text-center italic">— {t.boardTitle} —</h2>
            {translatedNotices.length > 0 ? (
              <div className="space-y-8 animate-in fade-in duration-1000">
                {translatedNotices.slice(0, 3).map((notice, i) => (
                    <div key={notice.id} className={`${i !== 0 ? 'pt-8 border-t border-slate-50' : ''}`}>
                        <h3 className="text-lg font-black text-slate-900 leading-tight tracking-tight mb-4">{notice.title}</h3>
                        <div className="text-[14px] text-slate-600 leading-relaxed bg-[#F9FBFF] p-6 rounded-[2rem] whitespace-pre-wrap font-medium border border-slate-100">
                        {notice.content}
                        </div>
                    </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                  <span className="text-3xl grayscale opacity-20">📣</span>
                </div>
                <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest">{t.noBoard}</p>
              </div>
            )}
          </div>
        </section>

        {/* 3. ゴミ出しカレンダー */}
        <section className="bg-white rounded-[3.5rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-white">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-6 opacity-20 text-5xl">♻️</div>
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 block mb-2 italic">Official Schedule</span>
              <span className="text-2xl font-black tracking-tighter italic">{t.trashTitle}</span>
            </div>
          </div>
          
          <div className="p-8 bg-slate-50/50 text-center border-b border-slate-100">
            <p className="text-[11px] font-black text-slate-500 leading-relaxed px-2">{t.trashHint}</p>
          </div>

          <div className="p-6 bg-slate-50 flex justify-between items-center px-8">
            <input type="month" value={selectedYearMonth} onChange={(e) => setSelectedYearMonth(e.target.value)}
              className="bg-white px-5 py-2.5 rounded-2xl text-[10px] font-black text-slate-800 outline-none border border-slate-200 shadow-sm" />
            <button onClick={() => setIsEditingCalendar(!isEditingCalendar)}
              className={`text-[10px] font-black uppercase px-6 py-2.5 rounded-full transition-all shadow-sm ${isEditingCalendar ? 'bg-slate-900 text-white' : 'bg-white text-emerald-600 border border-emerald-100'}`}>
              {isEditingCalendar ? t.complete : t.set}
            </button>
          </div>

          <div className="p-6 min-h-[260px] flex items-center justify-center bg-white px-8">
            {garbageCalendars[selectedYearMonth] ? (
              <div className="w-full">
                <img src={garbageCalendars[selectedYearMonth]} alt="Calendar" className="w-full h-auto rounded-[2.5rem] shadow-md border border-slate-50 active:scale-95 transition-transform" 
                  onClick={() => window.open(garbageCalendars[selectedYearMonth], '_blank')} />
                <p className="mt-4 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">タップして拡大表示</p>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                  <span className="text-4xl opacity-20">📸</span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.calendarNotSet}</p>
              </div>
            )}
          </div>

          {isEditingCalendar && (
            <div className="p-10 bg-[#F9FBFF] border-t border-slate-100 space-y-8 animate-in slide-in-from-top-4">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">🗓 {selectedYearMonth} の写真を選択</label>
                <input type="file" className="w-full text-[11px] text-slate-400 file:mr-4 file:py-4 file:px-8 file:rounded-2xl file:border-0 file:bg-slate-900 file:text-white" onChange={handleCalendarUpload} accept="image/*" disabled={uploading} />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">📞 {t.contactText}</label>
                <input type="tel" value={garbageContact} onChange={(e) => setGarbageContact(e.target.value)} onBlur={saveContactInfo}
                  className="w-full bg-white border-2 border-slate-100 p-5 rounded-3xl text-sm font-black outline-none focus:border-emerald-500 shadow-inner" />
              </div>
            </div>
          )}
        </section>

      </div>

      {/* 🚀 Navigation */}
      <div className="fixed bottom-10 left-0 right-0 px-10 z-50">
        <nav className="max-w-sm mx-auto h-24 bg-slate-900/90 backdrop-blur-3xl rounded-[3.5rem] shadow-2xl flex items-center justify-around px-8 border border-white/10 relative">
          <Link href="/resident/dashboard" className="flex flex-col items-center gap-2 group">
            <span className="text-3xl transition-transform group-active:scale-90">🏠</span>
            <span className="text-[9px] font-black uppercase text-blue-500 tracking-[0.2em]">{t.home}</span>
          </Link>
          <Link href="/resident/settings" className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100">
            <span className="text-3xl">⚙️</span>
            <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">{t.settings}</span>
          </Link>
          <button onClick={() => { supabase.auth.signOut(); window.location.href = '/login'; }} className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100">
            <span className="text-3xl">🚪</span>
            <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">{t.logout}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}