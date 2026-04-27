'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResidentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  
  const [priorityPosts, setPriorityPosts] = useState<any[]>([]); 
  const [notices, setNotices] = useState<any[]>([]);           
  
  const [loading, setLoading] = useState(true);
  
  const [garbageCalendars, setGarbageCalendars] = useState<any>({}); 
  const [selectedYearMonth, setSelectedYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [garbageContact, setGarbageContact] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isEditingCalendar, setIsEditingCalendar] = useState(false);

  // 🎯 カレンダー画像拡大用ステート
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [targetLang, setTargetLang] = useState('ja');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedPriorities, setTranslatedPriorities] = useState<any[]>([]);
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
      contactText: '粗大ゴミ等の問い合わせ先', 
      adsTitle: '近隣のトピックス', noAds: '周辺のお得な情報を探索中...', home: 'ホーム', settings: '設定', logout: 'ログアウト',
      langLabel: 'TRANSLATE / 多言語表示',
      viewFlyer: '資料を見る',
      postedAt: '配信日時'
    },
    en: {
      room: ' Room', mypage: 'My Page', postTitle: 'PRIORITY POST', noPost: 'Waiting for updates...',
      boardTitle: 'BULLETIN BOARD', noBoard: 'No notices at the moment.', 
      trashTitle: 'TRASH CALENDAR', 
      trashHint: 'Upload a photo of your local trash calendar to check it anytime here!',
      calendarNotSet: 'No calendar registered yet', set: 'Upload Photo', complete: 'Done',
      contactText: 'Trash Contact Info', 
      adsTitle: 'LOCAL TOPICS', noAds: 'Exploring local deals...', home: 'Home', settings: 'Settings', logout: 'Logout',
      langLabel: 'TRANSLATE',
      viewFlyer: 'View Document',
      postedAt: 'Posted at'
    }
  };
  const t = uiTexts[targetLang] || uiTexts.ja;

  useEffect(() => {
    fetchResidentData();
    return () => { handleTrackDuration(); };
  }, []);

  useEffect(() => {
    const doTranslate = async () => {
      if (targetLang === 'ja') {
        setTranslatedPriorities(priorityPosts);
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

      const transPriorities = await Promise.all(priorityPosts.map(async (p) => ({
        ...p, 
        title: await translateText(p.title), 
        content: await translateText(p.content || p.description || '')
      })));
      
      const transNotices = await Promise.all(notices.map(async (n) => ({
        ...n, 
        title: await translateText(n.title), 
        content: await translateText(n.content)
      })));
      
      setTranslatedPriorities(transPriorities);
      setTranslatedNotices(transNotices);
      setIsTranslating(false);
    };
    doTranslate();
  }, [targetLang, priorityPosts, notices]);

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
        const { data: flyers } = await supabase
          .from('digital_flyers')
          .select('*')
          .eq('property_id', prof.property_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        const { data: rawNotices } = await supabase
          .from('property_notifications')
          .select('*')
          .eq('property_id', prof.property_id)
          .order('created_at', { ascending: false });
        
        const now = new Date();
        const validNotices = (rawNotices || []).filter(n => {
           if (n.status === 'draft') return false;
           if (n.status === 'scheduled' && n.published_at) {
             if (new Date(n.published_at) > now) return false;
           }
           if (!n.is_permanent && n.expires_at) {
             if (new Date(n.expires_at) < now) return false;
           }
           if (n.target_audience) {
             if (Array.isArray(n.target_audience) && !n.target_audience.includes('resident') && !n.target_audience.includes('all')) return false;
             if (typeof n.target_audience === 'string' && !n.target_audience.includes('resident') && !n.target_audience.includes('all')) return false;
           }
           return true;
        });

        const urgentNotices = validNotices.filter(n => n.category === 'urgent');
        const regularNotices = validNotices.filter(n => n.category !== 'urgent');

        const combinedPriority = [...(flyers || []), ...urgentNotices].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setPriorityPosts(combinedPriority);
        setNotices(regularNotices);

        const allNoticeIds = validNotices.map(n => n.id);
        if (allNoticeIds.length > 0) {
            try {
                const readPayload = allNoticeIds.map(id => ({ notification_id: id, user_id: user.id }));
                await supabase.from('notification_reads').upsert(readPayload, { onConflict: 'notification_id, user_id' });
            } catch (e) {
                console.error("Failed to mark read status", e);
            }
        }

        if (flyers) {
          flyers.forEach(flyer => {
            if (!impressionTracked.current.has(flyer.id)) {
              // 🎯 修正：.catch() ではなく .then() でエラーを処理（TypeScriptの型エラー回避）
              supabase.rpc('increment_ad_views', { target_ad_id: flyer.id }).then(({ error }) => {
                if (error) console.warn("Impression track skipped", error.message);
              });
              impressionTracked.current.add(flyer.id);
            }
          });
        }
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleTrackDuration = async (adId?: string) => {
    if (viewStartTime.current && adId) {
      const duration = Math.round((Date.now() - viewStartTime.current) / 1000);
      if (duration > 0) {
        // 🎯 修正：await 実行後に error をチェックする形に変更
        const { error } = await supabase.rpc('add_ad_duration', { target_ad_id: adId, duration_seconds: duration });
        if (error) console.warn("Duration track skipped", error.message);
      }
      viewStartTime.current = null;
    }
  };

  const getPdfUrls = (urlString: string) => {
    if (!urlString) return [];
    return urlString.split(',').map(u => u.trim()).filter(u => u.length > 0);
  };

  const handleAdInteraction = async (adId: string, pdfUrl: string) => {
    if (!pdfUrl) return;
    viewStartTime.current = Date.now();
    
    // 🎯 修正：DBへの記録は非同期で投げつつ、エラー時は警告を出すだけにする
    supabase.rpc('increment_ad_clicks', { target_ad_id: adId }).then(({ error }) => {
        if (error) console.warn("Click tracking skipped for this entity type (expected behavior for new notices).");
    });
    
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
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
    } catch (err) { alert('アップロード失敗'); } finally { setUploading(false); }
  };

  const saveContactInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles').update({ garbage_contact_info: garbageContact }).eq('id', user?.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FA]">
      <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-[#F4F7FA] min-h-screen pb-44 font-sans overflow-x-hidden relative">
      
      {/* 🎯 拡大画像表示用モーダル */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col justify-center items-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="absolute top-6 right-6 z-[110]">
            <button 
              onClick={() => setZoomedImage(null)}
              className="w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white text-xl font-black transition-all"
            >
              ✕
            </button>
          </div>
          <div className="w-full h-full flex items-center justify-center overflow-auto" onClick={(e) => e.stopPropagation()}>
            <img 
              src={zoomedImage} 
              alt="Zoomed Calendar" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-90 duration-300"
            />
          </div>
        </div>
      )}

      {/* Immersive Header */}
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
        
        {/* 1. 重要ポスト */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{t.postTitle}</h2>
          </div>

          {translatedPriorities.length > 0 ? (
            <div className="space-y-6">
              {translatedPriorities.map((post) => {
                const pdfs = getPdfUrls(post.pdf_url);
                return (
                  <div 
                    key={post.id}
                    className="bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-800 p-10 text-white relative group transition-all"
                  >
                    <div className="absolute top-6 right-8 opacity-10 text-6xl">📬</div>
                    <div className="relative z-10">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <span className="text-[8px] font-black bg-blue-600 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">DIGITAL POST</span>
                        <span className="text-[9px] font-bold text-white/40 tabular-nums">
                           {t.postedAt}: {formatDate(post.published_at || post.created_at)}
                        </span>
                      </div>
                      
                      <h3 className="text-2xl font-black leading-tight mb-4 italic tracking-tight underline decoration-blue-500/50 underline-offset-4">
                          {post.title}
                      </h3>
                      <p className="text-[14px] text-slate-300 leading-relaxed font-medium bg-white/5 p-6 rounded-[2rem] border border-white/5 mb-8">
                          {post.content}
                      </p>
                      
                      <div className="space-y-3">
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Attachments / 添付資料</p>
                        <div className="grid grid-cols-1 gap-2">
                          {pdfs.length > 0 ? pdfs.map((url, index) => (
                            <button
                              key={index}
                              onClick={() => handleAdInteraction(post.id, url)}
                              className="w-full bg-white text-slate-900 py-4 px-6 rounded-2xl font-black text-[11px] flex items-center justify-between hover:bg-blue-50 transition-colors active:scale-[0.98]"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">📄</span>
                                <span className="uppercase tracking-tighter">{t.viewFlyer} {pdfs.length > 1 ? `#${index + 1}` : ''}</span>
                              </div>
                              <span className="text-slate-300">→</span>
                            </button>
                          )) : (
                            <p className="text-[10px] text-slate-500 italic ml-1">No flyer attached.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-900 rounded-[3.5rem] p-12 flex flex-col items-center gap-4 border-2 border-dashed border-slate-800">
              <span className="text-4xl opacity-20">📭</span>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{t.noPost}</p>
            </div>
          )}
        </section>

        {/* 2. デジタル掲示板（通常のお知らせ＋PDFボタン対応） */}
        <section className="bg-white rounded-[3.5rem] shadow-xl shadow-slate-200 border border-white overflow-hidden">
          <div className="p-10">
            <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-8 text-center italic">— {t.boardTitle} —</h2>
            {translatedNotices.length > 0 ? (
              <div className="space-y-8 animate-in fade-in duration-1000">
                {translatedNotices.slice(0, 5).map((notice, i) => {
                    const pdfs = getPdfUrls(notice.pdf_url);
                    return (
                        <div key={notice.id} className={`${i !== 0 ? 'pt-8 border-t border-slate-50' : ''}`}>
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-black text-slate-900 leading-tight tracking-tight">{notice.title}</h3>
                                <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md shrink-0">
                                    {formatDate(notice.published_at || notice.created_at).split(' ')[0]}
                                </span>
                            </div>
                            <div className="text-[14px] text-slate-600 leading-relaxed bg-[#F9FBFF] p-6 rounded-[2rem] whitespace-pre-wrap font-medium border border-slate-100 mb-4">
                                {notice.content}
                            </div>
                            
                            {/* PDFが添付されている場合のみボタンを表示 */}
                            {pdfs.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {pdfs.map((url, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAdInteraction(notice.id, url)}
                                            className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm"
                                        >
                                            📄 {t.viewFlyer} {pdfs.length > 1 ? `#${idx + 1}` : ''}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
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
                {/* 🎯 タップ時に別タブではなく、ステートにURLをセットしてモーダルを開く */}
                <img 
                  src={garbageCalendars[selectedYearMonth]} 
                  alt="Calendar" 
                  className="w-full h-auto rounded-[2.5rem] shadow-md border border-slate-50 active:scale-95 transition-transform cursor-pointer" 
                  onClick={() => setZoomedImage(garbageCalendars[selectedYearMonth])} 
                />
                <p className="mt-4 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">タップして拡大表示</p>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                  <span className="text-4xl opacity-20">📸</span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.calendarNotSet}</p>
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