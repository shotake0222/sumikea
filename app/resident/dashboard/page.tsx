'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResidentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  
  // 各セクションのデータ
  const [postingNotices, setPostingNotices] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [trashSchedules, setTrashSchedules] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(true);
  
  // カレンダー管理用
  const [garbageCalendars, setGarbageCalendars] = useState<any>({}); 
  const [selectedYearMonth, setSelectedYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [garbageContact, setGarbageContact] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isEditingCalendar, setIsEditingCalendar] = useState(false);

  // === 🌐 多言語翻訳用のState ===
  const [targetLang, setTargetLang] = useState('ja');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedPosting, setTranslatedPosting] = useState<any[]>([]);
  const [translatedNotices, setTranslatedNotices] = useState<any[]>([]);

  // 計測用
  const viewStartTime = useRef<number | null>(null);
  const impressionTracked = useRef<Set<string>>(new Set());

  // === 🌐 UI固定テキストの多言語辞書 ===
  const uiTexts: any = {
    ja: {
      room: '号室', mypage: 'マイページ', postTitle: 'ポスト', noPost: '現在、重要なお知らせはありません',
      boardTitle: 'デジタル掲示板', noBoard: '通知はありません', trashTitle: '今日のゴミ収集', noTrash: '収集なし',
      calendarNotSet: 'カレンダー未登録', set: '設定', complete: '完了',
      uploadText: 'の画像を登録', contactText: '粗大ゴミ等の問い合わせ', sending: '送信中...',
      adsTitle: '近隣のお得な情報', noAds: '配信中のチラシはありません', home: 'ホーム', settings: '設定', logout: 'ログアウト',
      langLabel: 'Language / 言語'
    },
    en: {
      room: ' Room', mypage: 'My Page', postTitle: 'POST', noPost: 'No important notices.',
      boardTitle: 'DIGITAL BOARD', noBoard: 'No notices.', trashTitle: "TODAY'S TRASH", noTrash: 'No collection',
      calendarNotSet: 'Not set', set: 'Set', complete: 'Done',
      uploadText: ' Upload Image', contactText: 'Trash Contact', sending: 'Sending...',
      adsTitle: 'LOCAL DEALS', noAds: 'No flyers available.', home: 'Home', settings: 'Settings', logout: 'Logout',
      langLabel: 'Language / Translate'
    },
    zh: {
      room: '号室', mypage: '我的主页', postTitle: '邮箱', noPost: '目前没有重要通知。',
      boardTitle: '电子公告板', noBoard: '没有通知。', trashTitle: '今日垃圾收集', noTrash: '无收集',
      calendarNotSet: '未注册', set: '设置', complete: '完成',
      uploadText: ' 上传图片', contactText: '大件垃圾联系', sending: '发送中...',
      adsTitle: '附近优惠信息', noAds: '目前没有传单。', home: '主页', settings: '设置', logout: '登出',
      langLabel: '语言 / 翻译'
    },
    vi: {
      room: ' Phòng', mypage: 'Trang của tôi', postTitle: 'HỘP THƯ', noPost: 'Hiện không có thông báo.',
      boardTitle: 'BẢNG TIN', noBoard: 'Không có thông báo.', trashTitle: 'RÁC HÔM NAY', noTrash: 'Không thu gom',
      calendarNotSet: 'Chưa đăng ký', set: 'Cài đặt', complete: 'Xong',
      uploadText: ' Tải ảnh lên', contactText: 'Liên hệ rác cỡ lớn', sending: 'Đang gửi...',
      adsTitle: 'ƯU ĐÃI ĐỊA PHƯƠNG', noAds: 'Không có tờ rơi.', home: 'Trang chủ', settings: 'Cài đặt', logout: 'Đăng xuất',
      langLabel: 'Ngôn ngữ / Dịch'
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
        setTranslatedPosting(postingNotices);
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
      const transPosting = await Promise.all(postingNotices.map(async (n) => ({
        ...n, title: await translateText(n.title), content: await translateText(n.content)
      })));
      const transNotices = await Promise.all(notices.map(async (n) => ({
        ...n, title: await translateText(n.title), content: await translateText(n.content)
      })));
      setTranslatedPosting(transPosting);
      setTranslatedNotices(transNotices);
      setIsTranslating(false);
    };
    if (postingNotices.length > 0 || notices.length > 0) doTranslate();
  }, [targetLang, postingNotices, notices]);

  const markAsRead = async (notificationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notification_reads').upsert({ notification_id: notificationId, user_id: user.id }, { onConflict: 'notification_id, user_id' });
  };

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
        const { data: rawPosting } = await supabase.from('property_notifications').select('*').eq('property_id', prof.property_id).eq('category', 'posting').order('created_at', { ascending: false }).limit(1);
        setPostingNotices(rawPosting || []);
        setTranslatedPosting(rawPosting || []);
        if (rawPosting?.[0]) markAsRead(rawPosting[0].id);

        const { data: rawNotices } = await supabase.from('property_notifications').select('*').eq('property_id', prof.property_id).neq('category', 'posting').order('created_at', { ascending: false });
        setNotices(rawNotices || []);
        setTranslatedNotices(rawNotices || []);

        const { data: trashData } = await supabase.from('trash_schedules').select('*').eq('property_id', prof.property_id);
        setTrashSchedules(trashData || []);

        const { data: rawAds } = await supabase.from('digital_flyers').select('*').eq('property_id', prof.property_id).eq('status', 'active').order('created_at', { ascending: false });
        setAds(rawAds || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
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
      if (duration > 0) await supabase.rpc('add_ad_duration', { target_ad_id: adId, duration_seconds: duration });
      viewStartTime.current = null;
    }
  };

  const handleAdInteraction = async (adId: string, pdfUrl: string) => {
    viewStartTime.current = Date.now();
    await supabase.rpc('increment_ad_clicks', { target_ad_id: adId });
    if (pdfUrl && pdfUrl !== '#') window.open(pdfUrl, '_blank');
    else alert('チラシの詳細準備中です');
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
      const filePath = `garbage/${user?.id}/${selectedYearMonth}_${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('user_documents').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('user_documents').getPublicUrl(filePath);
      const updatedCalendars = { ...garbageCalendars, [selectedYearMonth]: publicUrl };
      await supabase.from('profiles').update({ monthly_garbage_calendars: updatedCalendars }).eq('id', user?.id);
      setGarbageCalendars(updatedCalendars);
      alert(`${selectedYearMonth} ${t.complete}`);
    } catch (err) { alert('アップロード失敗'); } finally { setUploading(false); }
  };

  const saveContactInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles').update({ garbage_contact_info: garbageContact }).eq('id', user?.id);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-[#F8FAFC] min-h-screen pb-40 font-sans overflow-x-hidden relative">
      
      {/* ヘッダー & 強調された多言語スイッチ */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-8 pt-12 rounded-b-[4rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4 bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-50">
              {profile?.properties?.name || 'OFFICIAL PORTAL'}
            </span>
          </div>

          <h1 className="text-4xl font-black tracking-tighter italic mb-8 drop-shadow-lg">
             {profile?.room_number ? `${profile.room_number}${t.room}` : t.mypage}
          </h1>

          {/* 🌐 強調された言語選択セクション */}
          <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-[2rem] shadow-inner">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{t.langLabel}</span>
              {isTranslating && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
            </div>
            <div className="flex justify-around items-center">
              {[
                { id: 'ja', flag: '🇯🇵', label: 'JP' },
                { id: 'en', flag: '🇺🇸', label: 'EN' },
                { id: 'zh', flag: '🇨🇳', label: 'CN' },
                { id: 'vi', flag: '🇻🇳', label: 'VN' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setTargetLang(lang.id)}
                  className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${targetLang === lang.id ? 'scale-110' : 'opacity-40 grayscale-[50%] hover:opacity-100 hover:grayscale-0'}`}
                >
                  <span className="text-3xl shadow-xl">{lang.flag}</span>
                  <span className={`text-[9px] font-black tracking-tighter ${targetLang === lang.id ? 'text-white' : 'text-blue-200'}`}>{lang.label}</span>
                  {targetLang === lang.id && <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-8 -mt-6 relative z-20">
        
        {/* 1. ポスト (📬 ぽすっと) */}
        <section className="bg-indigo-950 rounded-[3rem] shadow-2xl border border-indigo-800 overflow-hidden text-white relative transform hover:scale-[1.02] transition-transform">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl">📬</div>
          <div className="p-10">
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 italic flex items-center gap-2">
              <span className="w-1 h-3 bg-indigo-400 rounded-full"></span>
              {t.postTitle}
            </h2>
            {translatedPosting.length > 0 ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h3 className="text-xl font-black leading-tight mb-2 italic tracking-tight">{translatedPosting[0].title}</h3>
                <div className="h-px w-full bg-gradient-to-r from-indigo-500 to-transparent mb-4 opacity-30"></div>
                <p className="text-[13px] text-indigo-100/90 leading-relaxed font-medium">{translatedPosting[0].content}</p>
              </div>
            ) : (
              <div className="py-6 opacity-30 text-[10px] font-black uppercase text-center tracking-widest border-2 border-dashed border-indigo-800 rounded-3xl">
                {t.noPost}
              </div>
            )}
          </div>
        </section>

        {/* 2. デジタル掲示板 */}
        <section className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 bg-slate-100"></div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{t.boardTitle}</h2>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>
            {translatedNotices.length > 0 ? (
              <div className="space-y-5 animate-in fade-in duration-700">
                <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tighter">{translatedNotices[0].title}</h3>
                <p className="text-[14px] text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-[2rem] whitespace-pre-wrap font-medium border border-slate-50 transition-all">
                  {translatedNotices[0].content}
                </p>
              </div>
            ) : (
              <p className="text-center text-slate-300 text-[10px] font-black uppercase tracking-widest py-8">{t.noBoard}</p>
            )}
          </div>
        </section>

        {/* 3. 近隣のお得な情報 (デジタルチラシ) */}
        <section className="space-y-5">
          <div className="flex items-center justify-between px-3">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">{t.adsTitle}</h2>
            <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">NEW DEALS</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {ads.length > 0 ? ads.map((ad) => (
              <div 
                key={ad.id} 
                onClick={() => handleAdInteraction(ad.id, ad.pdf_url)}
                className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6 active:scale-95 transition-all cursor-pointer hover:border-blue-200 hover:shadow-lg group"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl flex items-center justify-center text-3xl shrink-0 group-hover:rotate-12 transition-transform">
                  {ad.target_metadata?.emoji || '🏷️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">{ad.target_metadata?.discount || 'SALE'}</span>
                    <div className="h-1 w-1 bg-slate-200 rounded-full"></div>
                    <span className="text-[9px] font-bold text-slate-400">PICK UP</span>
                  </div>
                  <h4 className="text-md font-black text-slate-800 truncate mb-1 tracking-tight">{ad.title}</h4>
                  <p className="text-[11px] text-slate-400 truncate font-medium">{ad.content || 'Tap to view details'}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 text-sm font-black group-hover:bg-blue-600 group-hover:text-white transition-colors">→</div>
              </div>
            )) : (
              <div className="py-12 text-center bg-slate-100/30 rounded-[3rem] border border-dashed border-slate-200">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">{t.noAds}</p>
              </div>
            )}
          </div>
        </section>

        {/* 4. 今日のゴミ収集 */}
        <section className="bg-white rounded-[3rem] overflow-hidden shadow-xl shadow-slate-200/50 border-2 border-white">
          <div className="bg-emerald-500 p-6 text-white flex justify-between items-center shadow-lg relative">
            <div className="absolute -left-2 top-0 bottom-0 w-4 bg-emerald-600/30 blur-sm"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 italic">{t.trashTitle}</span>
              <span className="text-2xl font-black tracking-tighter italic">
                {getTodayTrash().length > 0 ? getTodayTrash().map(t => t.trash_type).join('・') : t.noTrash}
              </span>
            </div>
            <span className="text-4xl filter drop-shadow-md">♻️</span>
          </div>
          
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <input 
              type="month" 
              value={selectedYearMonth}
              onChange={(e) => setSelectedYearMonth(e.target.value)}
              className="bg-white px-4 py-2 rounded-xl text-xs font-black text-slate-700 outline-none cursor-pointer border border-slate-200 shadow-sm"
            />
            <button 
              onClick={() => setIsEditingCalendar(!isEditingCalendar)}
              className="text-[10px] font-black uppercase text-blue-600 bg-white border border-blue-100 px-4 py-2 rounded-full shadow-sm active:scale-95 transition-all"
            >
              {isEditingCalendar ? t.complete : t.set}
            </button>
          </div>

          <div className="p-4 min-h-[200px] flex items-center justify-center bg-white relative">
            {garbageCalendars[selectedYearMonth] ? (
              <img src={garbageCalendars[selectedYearMonth]} alt="Calendar" className="w-full h-auto rounded-[1.5rem] shadow-sm cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(garbageCalendars[selectedYearMonth], '_blank')} />
            ) : (
              <div className="text-center">
                <span className="text-4xl block mb-2 opacity-20">🗓️</span>
                <p className="text-[11px] font-black text-slate-400 italic tracking-widest uppercase">{t.calendarNotSet}</p>
              </div>
            )}
          </div>

          {isEditingCalendar && (
            <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-6 animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">🗓 {selectedYearMonth} {t.uploadText}</label>
                <div className="relative group">
                  <input type="file" className="w-full text-xs text-slate-400 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-[10px] file:font-black file:bg-slate-900 file:text-white cursor-pointer" onChange={handleCalendarUpload} accept="image/*" disabled={uploading} />
                  {uploading && <span className="absolute right-4 top-3 text-[10px] font-black text-blue-600 animate-pulse">{t.sending}</span>}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">📞 {t.contactText}</label>
                <input 
                  type="tel" 
                  value={garbageContact}
                  onChange={(e) => setGarbageContact(e.target.value)}
                  onBlur={saveContactInfo}
                  placeholder="000-0000-0000"
                  className="w-full bg-white border-2 border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all shadow-inner"
                />
              </div>
            </div>
          )}
          
          {!isEditingCalendar && garbageContact && (
            <div className="px-6 pb-8 bg-white">
              <a href={`tel:${garbageContact}`} className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4 border border-slate-100 hover:bg-slate-100 transition-colors">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t.contactText}</p>
                  <p className="text-sm font-black text-slate-900 tracking-tight">{garbageContact}</p>
                </div>
              </a>
            </div>
          )}
        </section>

      </div>

      {/* ボトムナビゲーション */}
      <div className="fixed bottom-8 left-0 right-0 px-8 z-50">
        <nav className="max-w-sm mx-auto h-22 bg-slate-900/95 backdrop-blur-3xl rounded-[3rem] shadow-2xl flex items-center justify-around px-6 border border-white/10 ring-1 ring-white/5">
          <Link href="/resident/dashboard" className="flex flex-col items-center gap-1.5 group">
            <span className="text-3xl filter drop-shadow-md">📢</span>
            <span className="text-[9px] font-black uppercase text-blue-500 tracking-[0.2em]">{t.home}</span>
            <div className="h-1 w-4 bg-blue-500 rounded-full"></div>
          </Link>
          <Link href="/resident/settings" className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-all hover:scale-110">
            <span className="text-3xl filter drop-shadow-md">⚙️</span>
            <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">{t.settings}</span>
          </Link>
          <button onClick={() => { supabase.auth.signOut(); window.location.href = '/login'; }} className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-all hover:scale-110">
            <span className="text-3xl filter drop-shadow-md">🚪</span>
            <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">{t.logout}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}