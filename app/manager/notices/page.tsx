'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { uploadImage } from '../../../lib/upload';

export default function ManagementNoticePage() {
  const router = useRouter();
  
  // --- 状態管理 ---
  const [managedProperties, setManagedProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  
  // 配信設定用
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('campaign');
  const [targetAudience] = useState('resident');
  const [sendPush, setSendPush] = useState(false); 
  const [status, setStatus] = useState<'published' | 'draft' | 'scheduled'>('published');
  
  const [isPermanent, setIsPermanent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [scheduledAt, setScheduledAt] = useState(''); 
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // モーダル管理用
  const [showPreview, setShowPreview] = useState(false);
  const [showReadList, setShowReadList] = useState<{show: boolean, users: any[]}>({show: false, users: []});

  // --- 初期データ取得 ---
  useEffect(() => {
    const fetchAuthAndData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.push('/login?type=manager'); return; }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        const role = profile?.role?.toUpperCase() || 'USER';
        
        if (role !== 'ADMIN' && role !== 'MANAGER') { router.push('/login?type=manager'); return; }
        
        let propertyList: any[] = [];
        if (role === 'ADMIN') {
          const { data: allProps } = await supabase.from('properties').select('id, name');
          if (allProps) {
            propertyList = allProps.map(p => ({ property_id: p.id, properties: { name: p.name } }));
          }
        } else {
          const { data: managerProps } = await supabase.from('property_managers').select('property_id, properties(name)').eq('user_id', user.id);
          if (managerProps) propertyList = managerProps;
        }
        
        if (propertyList.length > 0) {
          setManagedProperties(propertyList);
          setSelectedProperty(propertyList[0].property_id);
          fetchNoticeHistory(propertyList[0].property_id);
        }
      } catch (err) {
        console.error('データ取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuthAndData();
  }, [router]);

  const fetchNoticeHistory = async (propId: string) => {
    try {
      const { data: notices } = await supabase
        .from('property_notifications')
        .select(`*, read_count:notification_reads(count)`)
        .eq('property_id', propId)
        .order('created_at', { ascending: false })
        .limit(5);

      const { count: totalResidents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', propId)
        .eq('role', 'USER');

      if (notices) {
        const formatted = notices.map(n => ({
          ...n,
          actual_read_count: n.read_count?.[0]?.count || 0,
          total_residents: totalResidents || 0
        }));
        setRecentNotices(formatted);
      }
    } catch (err) {
      console.error('履歴取得エラー:', err);
    }
  };

  // 既読詳細の取得 (機能4: 既読詳細表示)
  const handleShowReadDetails = async (noticeId: string) => {
    const { data } = await supabase
      .from('notification_reads')
      .select('read_at, profiles(full_name, room_number)')
      .eq('notification_id', noticeId);
    setShowReadList({ show: true, users: data || [] });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'management-docs');
      setPdfUrl(url);
    } catch (err) {
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // --- 送信処理 (機能1: バリデーション / 機能2: 予約 / 機能3: 下書き / Webhook連携) ---
  const handleSubmit = async (e: React.FormEvent, forcedStatus?: typeof status) => {
    e.preventDefault();
    const targetStatus = forcedStatus || status;

    // バリデーション
    if (!selectedProperty) return alert('配信先の物件を選択してください');
    if (title.length < 5) return alert('タイトルは5文字以上入力してください（住民の視認性向上のため）');
    if (!content) return alert('本文を入力してください');
    if (targetStatus === 'scheduled' && !scheduledAt) return alert('予約配信日時を設定してください');

    setIsSubmitting(true);
    
    // 緊急カテゴリーの場合はタイトルに自動付与
    const finalTitle = category === 'urgent' && !title.includes('【重要】') ? `【重要】${title}` : title;

    const { error } = await supabase.from('property_notifications').insert({
      property_id: selectedProperty,
      title: finalTitle,
      content,
      category,
      target_audience: targetAudience,
      pdf_url: pdfUrl,
      is_permanent: isPermanent,
      expires_at: isPermanent ? null : new Date(expiresAt).toISOString(),
      scheduled_at: targetStatus === 'scheduled' ? new Date(scheduledAt).toISOString() : null,
      status: targetStatus,
      send_push: sendPush // 👈 ここが重要！Webhookがこのフラグを見て通知を飛ばします
    });

    if (!error) {
      const successMsg = targetStatus === 'draft' 
        ? '下書きとして保存しました' 
        : '設定が完了しました' + (sendPush ? '（Webhookにより通知が配信されます）' : '');
      
      alert(successMsg);
      setTitle(''); setContent(''); setPdfUrl(''); setStatus('published'); setSendPush(false); setShowPreview(false);
      fetchNoticeHistory(selectedProperty);
    } else {
      alert('エラー: ' + error.message);
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-slate-400 animate-pulse">
      配信環境をロード中...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* ヘッダー */}
        <header className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
              住民お知らせ <span className="text-blue-600">配信</span>
            </h1>
          </div>
          
          <div className="w-full lg:w-96 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="flex-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">配信対象の物件</label>
              <select 
                className="w-full bg-transparent font-bold text-slate-700 outline-none cursor-pointer text-lg"
                value={selectedProperty}
                onChange={(e) => { setSelectedProperty(e.target.value); fetchNoticeHistory(e.target.value); }}
              >
                {managedProperties.map((p, i) => (
                  <option key={p.property_id || i} value={p.property_id}>{p.properties?.name}</option>
                ))}
              </select>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xl">🏢</div>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="bg-white rounded-[3.5rem] p-8 md:p-14 shadow-2xl shadow-slate-200/40 border border-slate-100 space-y-10">
              
              {/* ステータス切り替え & プレビューボタン (機能: 下書き/予約/プレビュー) */}
              <div className="flex justify-between items-center border-b border-slate-50 pb-8">
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  {[
                    { id: 'published', label: '即時配信' },
                    { id: 'scheduled', label: '予約配信' },
                    { id: 'draft', label: '下書き' }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setStatus(s.id as any)}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${status === s.id ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setShowPreview(true)} 
                  className="text-[10px] font-black text-slate-400 hover:text-blue-600 flex items-center gap-2 italic uppercase transition-colors">
                  送信前プレビューを表示 👁️
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">カテゴリー</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ id: 'urgent', label: '緊急連絡', icon: '🚨' }, { id: 'maintenance', label: '工事・点検', icon: '🔧' }, { id: 'campaign', label: 'お知らせ', icon: '📢' }, { id: 'local', label: '地域情報', icon: '📍' }].map((cat) => (
                      <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl text-[11px] font-bold border-2 transition-all ${category === cat.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                        <span>{cat.icon}</span> {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">スケジュール管理</label>
                  <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100">
                    {status === 'scheduled' && (
                      <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                        <span className="text-[9px] font-bold text-blue-600 ml-1">配信予定日時を指定</span>
                        <input type="datetime-local" className="w-full p-3 rounded-xl border-none font-bold text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-100" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                      </div>
                    )}
                    <button type="button" onClick={() => setIsPermanent(!isPermanent)}
                      className={`w-full py-4 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${isPermanent ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                      {isPermanent ? '✅ 常にトップに固定表示' : '自動非表示の日時を設定'}
                    </button>
                    {!isPermanent && (
                      <input type="datetime-local" className="w-full p-4 rounded-xl border-none font-bold text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-100" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">タイトル</label>
                  <input className="w-full bg-slate-50 border-none p-7 rounded-[2rem] text-xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-200"
                      value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：【重要】水害による点検のお知らせ" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">本文内容</label>
                    <textarea className="w-full bg-slate-50 border-none p-8 rounded-[2.5rem] h-64 text-slate-700 outline-none resize-none leading-relaxed focus:ring-4 focus:ring-blue-50 text-lg font-medium"
                        value={content} onChange={(e) => setContent(e.target.value)} placeholder="住民の方へ伝えたい内容を詳しく..." />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">画像・資料の添付</label>
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] h-64 cursor-pointer transition-all ${pdfUrl ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                      {uploading ? <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" /> : 
                        <div className="text-center p-6">
                          <span className="text-5xl mb-4 block">{pdfUrl ? '📄' : '📤'}</span>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{pdfUrl ? 'アップロード済み' : 'ファイルを添付'}</p>
                        </div>
                      }
                      <input type="file" className="hidden" onChange={handlePdfUpload} accept="application/pdf,image/*" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                {/* プッシュ通知スイッチ */}
                <div className="flex-1 flex items-center gap-4 p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100 group cursor-pointer hover:bg-blue-100 transition-all">
                  <input type="checkbox" id="push-notify" checked={sendPush} onChange={(e) => setSendPush(e.target.checked)} className="w-6 h-6 accent-blue-600 rounded-lg cursor-pointer" />
                  <label htmlFor="push-notify" className="flex-1 cursor-pointer">
                    <p className="text-sm font-black text-blue-900 uppercase italic tracking-tighter">プッシュ通知を送信</p>
                    <p className="text-[10px] text-blue-600 font-bold opacity-70">住民の端末へ即時一斉通知</p>
                  </label>
                </div>

                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-blue-600 text-white py-8 rounded-[3rem] font-black text-2xl hover:bg-slate-900 transition-all shadow-2xl shadow-blue-200 disabled:opacity-50 uppercase tracking-tighter italic">
                  {isSubmitting ? '処理中...' : status === 'draft' ? '下書きを保存' : status === 'scheduled' ? '予約配信を設定' : '今すぐ住民へ配信'}
                </button>
              </div>
            </form>
          </div>

          {/* 右サイド：履歴 (機能: 既読詳細トリガー) */}
          <div className="w-full xl:w-96 space-y-6">
            <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100 sticky top-10">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic mb-10">最新の配信履歴</h3>
              <div className="space-y-10">
                {recentNotices.map((notice) => {
                  const readRate = notice.total_residents > 0 ? Math.round((notice.actual_read_count / notice.total_residents) * 100) : 0;
                  return (
                    <div key={notice.id} className="group border-b border-slate-50 pb-8 last:border-0">
                      <div className="flex gap-4 items-start mb-5">
                        <span className="text-lg bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                          {notice.category === 'urgent' ? '🚨' : '📢'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-black text-slate-800 line-clamp-1 mb-1">{notice.title}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span className={`px-2 py-0.5 rounded ${notice.status === 'draft' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                              {notice.status.toUpperCase()}
                            </span>
                            <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      {/* 既読バーをクリックすると詳細リストを表示 */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:bg-blue-50 transition-all group/bar" 
                        onClick={() => handleShowReadDetails(notice.id)}>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[9px] font-black text-slate-400 italic group-hover/bar:text-blue-600">既読率（クリックで詳細）</span>
                          <span className="text-xs font-black text-blue-600">{notice.actual_read_count} / {notice.total_residents}人</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all duration-1000 shadow-[0_0_8px_rgba(37,99,235,0.4)]" style={{ width: `${readRate}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {recentNotices.length === 0 && (
                  <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase tracking-widest">配信履歴なし</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- モーダル: 既読者詳細 --- */}
        {showReadList.show && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowReadList({ ...showReadList, show: false })}>
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h4 className="text-xl font-black italic tracking-tighter">閲覧ユーザー詳細</h4>
                <button onClick={() => setShowReadList({ ...showReadList, show: false })} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors">✕</button>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {showReadList.users.length > 0 ? showReadList.users.map((u, i) => (
                  <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                    <div>
                      <p className="font-black text-slate-800">{u.profiles?.full_name || '名称未設定'}</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{u.profiles?.room_number || '---'}号室</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm">
                      {new Date(u.read_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )) : <p className="text-center text-slate-400 py-10 font-bold">まだ既読ユーザーはいません</p>}
              </div>
            </div>
          </div>
        )}

        {/* --- モーダル: スマホ表示プレビュー (機能5: プレビュー) --- */}
        {showPreview && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-6 overflow-y-auto" onClick={() => setShowPreview(false)}>
            <div className="relative animate-in slide-in-from-bottom-10 duration-500" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowPreview(false)} className="absolute -top-14 right-0 text-white font-black text-sm bg-white/10 px-6 py-2 rounded-full hover:bg-white/20 transition-all uppercase tracking-[0.2em]">CLOSE ✕</button>
              
              {/* スマホ外枠 */}
              <div className="w-[340px] h-[680px] bg-slate-800 rounded-[4rem] p-3 shadow-2xl border-[4px] border-slate-700/50">
                <div className="w-full h-full bg-white rounded-[3.2rem] overflow-hidden flex flex-col relative">
                  
                  {/* アプリヘッダー風 */}
                  <div className="bg-blue-600 p-8 pt-16 text-white shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded uppercase tracking-widest">{category}</span>
                      <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                      <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Notification</span>
                    </div>
                    <h5 className="font-black text-2xl leading-tight tracking-tighter italic">{title || 'ここにタイトルが入ります'}</h5>
                  </div>

                  {/* コンテンツエリア */}
                  <div className="p-8 flex-1 overflow-y-auto space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                      <span className="text-[11px] font-bold text-slate-400 italic">2026.04.25</span>
                      <span className="text-[11px] font-bold text-blue-600">管理組合より</span>
                    </div>
                    <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                      {content || '住民の方へ表示される本文のプレビューです。入力した内容がここにリアルタイムで反映されます。'}
                    </p>
                    {pdfUrl && (
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-6 text-center">
                        <span className="text-3xl block mb-2">📄</span>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">添付資料あり</p>
                      </div>
                    )}
                  </div>

                  {/* 下部ボタン風 */}
                  <div className="p-8 pt-0 shrink-0">
                    <div className="w-full bg-slate-900 h-14 rounded-[1.5rem] flex items-center justify-center text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200">
                      内容を確認しました
                    </div>
                    <div className="h-1.5 w-32 bg-slate-200 mx-auto mt-6 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-16 text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
          Posutto 管理コンソール v3.5 / {selectedProperty ? 'オンライン' : '待機中'}
        </footer>
      </div>
    </div>
  );
}