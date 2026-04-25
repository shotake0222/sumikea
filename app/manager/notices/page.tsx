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
  const [selectedPropertyData, setSelectedPropertyData] = useState<any>(null);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  
  // 配信設定用
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('campaign');
  const [targetAudience] = useState('resident');
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
  const [showPrintModal, setShowPrintModal] = useState(false);
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
          const { data: allProps } = await supabase.from('properties').select('id, name, invite_code');
          if (allProps) {
            propertyList = allProps.map(p => ({ property_id: p.id, properties: { name: p.name, invite_code: p.invite_code } }));
          }
        } else {
          const { data: managerProps } = await supabase.from('property_managers').select('property_id, properties(name, invite_code)').eq('user_id', user.id);
          if (managerProps) propertyList = managerProps;
        }
        
        if (propertyList.length > 0) {
          setManagedProperties(propertyList);
          setSelectedProperty(propertyList[0].property_id);
          setSelectedPropertyData(propertyList[0].properties);
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

  const handlePropertyChange = (propId: string) => {
    setSelectedProperty(propId);
    const found = managedProperties.find(p => p.property_id === propId);
    if (found) setSelectedPropertyData(found.properties);
    fetchNoticeHistory(propId);
  };

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

  const handleSubmit = async (e: React.FormEvent, forcedStatus?: typeof status) => {
    e.preventDefault();
    const targetStatus = forcedStatus || status;

    if (!selectedProperty) return alert('配信先の物件を選択してください');
    if (title.length < 5) return alert('タイトルは5文字以上入力してください');
    if (!content) return alert('本文を入力してください');
    if (targetStatus === 'scheduled' && !scheduledAt) return alert('予約配信日時を設定してください');

    setIsSubmitting(true);
    
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
      status: targetStatus
    });

    if (!error) {
      alert(targetStatus === 'draft' ? '下書きとして保存しました' : '住民へのお知らせ配信設定が完了しました');
      setTitle(''); setContent(''); setPdfUrl(''); setStatus('published'); setShowPreview(false);
      fetchNoticeHistory(selectedProperty);
    } else {
      alert('エラー: ' + error.message);
    }
    setIsSubmitting(false);
  };

  const getQrCodeUrl = () => {
    const baseUrl = "https://posutto.vercel.app/login?type=user";
    return `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(baseUrl)}&choe=UTF-8`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-slate-400 animate-pulse">
      配信環境をロード中...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
                住民お知らせ <span className="text-blue-600">配信</span>
              </h1>
            </div>
            
            <div className="w-full lg:w-auto min-w-[300px]">
              <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">操作中の物件</label>
                  <select 
                    className="w-full bg-transparent font-bold text-slate-700 outline-none cursor-pointer text-base"
                    value={selectedProperty}
                    onChange={(e) => handlePropertyChange(e.target.value)}
                  >
                    {managedProperties.map((p, i) => (
                      <option key={p.property_id || i} value={p.property_id}>{p.properties?.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-lg">🏢</div>
              </div>
            </div>
          </div>

          {/* 新設：目立つ印刷案内セクション */}
          <div className="bg-blue-600 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-blue-200/50 flex flex-col md:flex-row items-center gap-6 transition-transform hover:scale-[1.01]">
            <button 
              onClick={() => setShowPrintModal(true)}
              className="bg-white text-blue-600 w-20 h-20 md:w-24 md:h-24 rounded-[2rem] shadow-lg hover:bg-slate-900 hover:text-white transition-all flex flex-col items-center justify-center gap-1 group shrink-0"
            >
              <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform">🖨️</span>
              <span className="text-[10px] font-black uppercase tracking-tighter">PRINT</span>
            </button>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-black mb-1">住民への登録案内はこちらのアイコンから印刷を</h2>
              <p className="text-blue-100 text-sm font-bold">
                印刷したチラシを掲示板や各戸へ配布することで、住民の皆さまがスムーズにアプリを利用開始できます。
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="bg-white rounded-[3.5rem] p-8 md:p-14 shadow-2xl shadow-slate-200/40 border border-slate-100 space-y-10">
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
                  className="text-[10px] font-black text-slate-400 hover:text-blue-600 flex items-center gap-2 italic uppercase">
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">掲載期間設定</label>
                  <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100">
                    {status === 'scheduled' && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-blue-600 ml-1">配信予定日時</span>
                        <input type="datetime-local" className="w-full p-3 rounded-xl border-none font-bold text-sm outline-none shadow-sm" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                      </div>
                    )}
                    <button type="button" onClick={() => setIsPermanent(!isPermanent)}
                      className={`w-full py-4 rounded-xl text-[10px] font-black transition-all ${isPermanent ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                      {isPermanent ? '✅ 常にトップに固定' : '掲載終了日時を指定する'}
                    </button>
                    {!isPermanent && (
                      <input type="datetime-local" className="w-full p-4 rounded-xl border-none font-bold text-sm shadow-sm outline-none" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <input className="w-full bg-slate-50 border-none p-7 rounded-[2rem] text-xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-200"
                    value={title} onChange={(e) => setTitle(e.target.value)} placeholder="配信タイトル（5文字以上）" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <textarea className="md:col-span-2 w-full bg-slate-50 border-none p-8 rounded-[2.5rem] h-64 text-slate-700 outline-none resize-none leading-relaxed focus:ring-4 focus:ring-blue-50 text-lg font-medium"
                      value={content} onChange={(e) => setContent(e.target.value)} placeholder="住民の方へ伝えたい内容を詳しく入力してください..." />
                  
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] h-64 cursor-pointer transition-all ${pdfUrl ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                    {uploading ? <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" /> : 
                      <div className="text-center p-6">
                        <span className="text-5xl mb-4 block">{pdfUrl ? '📄' : '📤'}</span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{pdfUrl ? '添付済み' : 'ファイルを添付'}</p>
                      </div>
                    }
                    <input type="file" className="hidden" onChange={handlePdfUpload} accept="application/pdf,image/*" />
                  </label>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-8 rounded-[3rem] font-black text-2xl hover:bg-slate-900 transition-all shadow-2xl shadow-blue-200 disabled:opacity-50 uppercase tracking-tighter italic">
                {isSubmitting ? '処理中...' : status === 'draft' ? '下書きを保存' : status === 'scheduled' ? '予約配信を設定' : '住民へ配信を開始'}
              </button>
            </form>
          </div>

          <div className="w-full xl:w-96 space-y-6">
            <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100 sticky top-10">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic mb-10">配信履歴</h3>
              <div className="space-y-10">
                {recentNotices.map((notice) => {
                  const readRate = notice.total_residents > 0 ? Math.round((notice.actual_read_count / notice.total_residents) * 100) : 0;
                  return (
                    <div key={notice.id} className="group border-b border-slate-50 pb-8 last:border-0">
                      <div className="flex gap-4 items-start mb-5" onClick={() => handleShowReadDetails(notice.id)}>
                        <span className="text-lg bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center group-hover:bg-blue-50 cursor-pointer">
                          {notice.category === 'urgent' ? '🚨' : '📢'}
                        </span>
                        <div className="flex-1 cursor-pointer">
                          <p className="text-sm font-black text-slate-800 line-clamp-1">{notice.title}</p>
                          <p className="text-[10px] font-bold text-slate-400">{new Date(notice.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:bg-blue-50 transition-all" onClick={() => handleShowReadDetails(notice.id)}>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[9px] font-black text-slate-400 italic">閲覧数</span>
                          <span className="text-xs font-black text-blue-600">{notice.actual_read_count} / {notice.total_residents}人</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${readRate}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 印刷用モーダル */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 md:p-6 overflow-y-auto" onClick={() => setShowPrintModal(false)}>
            <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-end mb-4 gap-4 no-print">
                <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-3 rounded-full font-black shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2">
                   <span>🖨️</span> 印刷画面を開く
                </button>
                <button onClick={() => setShowPrintModal(false)} className="bg-white/20 text-white px-6 py-3 rounded-full font-black backdrop-blur-md">閉じる ✕</button>
              </div>

              <div id="print-area" className="bg-white p-8 md:p-16 shadow-2xl rounded-sm text-slate-900 border-[12px] border-blue-600">
                <div className="text-center mb-12">
                  <h2 className="text-5xl font-black italic tracking-tighter text-blue-600 mb-2 uppercase">Posutto</h2>
                  <p className="text-xl font-bold tracking-widest text-slate-400 italic">Resident Portal Invitation</p>
                </div>

                <div className="border-y-4 border-slate-100 py-8 mb-10 text-center">
                  <p className="text-sm font-black text-slate-400 mb-2">対象物件</p>
                  <h3 className="text-4xl font-black tracking-tight mb-8">{selectedPropertyData?.name}</h3>
                  
                  <div className="bg-slate-50 inline-block p-8 rounded-[3rem] border border-slate-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">あなたの招待コード</p>
                    <div className="text-6xl font-black tracking-[0.2em] italic text-slate-900 select-all">
                      {selectedPropertyData?.invite_code || '---'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
                  <div className="space-y-6">
                    <h4 className="text-2xl font-black border-l-8 border-blue-600 pl-4 mb-6">ご利用開始の手順</h4>
                    <div className="space-y-4">
                      {[
                        { step: '1', title: 'スキャン', desc: '右のQRコードをスマホで読み取ります。' },
                        { step: '2', title: 'ログイン', desc: '画面に従い、ログイン・新規登録をします。' },
                        { step: '3', title: 'コード入力', desc: '上記の招待コードを入力して物件と連携！' }
                      ].map((item) => (
                        <div key={item.step} className="flex gap-4 items-start">
                          <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black shrink-0">{item.step}</span>
                          <div>
                            <p className="font-black text-lg">{item.title}</p>
                            <p className="text-xs text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-4 bg-white border-4 border-slate-900 rounded-[2.5rem] shadow-xl">
                      <img src={getQrCodeUrl()} alt="Invitation QR" className="w-40 h-40" />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Scan to access</p>
                  </div>
                </div>

                {/* 案内セクション */}
                <div className="bg-blue-50/50 rounded-[3rem] p-10 border-2 border-dashed border-blue-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 text-4xl opacity-20">✨</div>
                  <h4 className="text-center text-xl font-black text-blue-700 mb-8">マイページで、暮らしをもっと便利に。</h4>
                  
                  <div className="grid grid-cols-3 gap-6 relative z-10">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl mb-3 border border-blue-100">📮</div>
                      <p className="text-xs font-black text-slate-700 mb-1">デジタルポスト</p>
                      <p className="text-[9px] font-bold text-slate-400 leading-tight">掲示板や配布物を<br/>スマホでいつでも確認</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl mb-3 border border-blue-100">🗑️</div>
                      <p className="text-xs font-black text-slate-700 mb-1">ゴミカレンダー</p>
                      <p className="text-[9px] font-bold text-slate-400 leading-tight">収集日をWebでチェック<br/>出し忘れも防げます</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl mb-3 border border-blue-100">🏘️</div>
                      <p className="text-xs font-black text-slate-700 mb-1">近隣・地域情報</p>
                      <p className="text-[9px] font-bold text-slate-400 leading-tight">マンション周辺の<br/>役立つ情報を集約</p>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-center gap-3">
                    <div className="h-px bg-blue-200 flex-1"></div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">Posutto Experience</span>
                    <div className="h-px bg-blue-200 flex-1"></div>
                  </div>
                </div>

                <div className="mt-12 text-center">
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                    本サービスは管理会社からのお知らせ、ゴミカレンダー等をデジタルで確認できるサービスです。<br/>
                    紙の配布物を減らし、住み心地の良いマンション環境を創ります。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* モーダル：プレビュー */}
        {showPreview && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-6 overflow-y-auto" onClick={() => setShowPreview(false)}>
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowPreview(false)} className="absolute -top-12 right-0 text-white font-black text-xl">CLOSE ✕</button>
              <div className="w-[320px] h-[640px] bg-white rounded-[3rem] overflow-hidden border-[8px] border-slate-800 shadow-2xl flex flex-col">
                <div className="bg-blue-600 p-6 pt-12 text-white">
                  <h5 className="font-black text-lg leading-tight">{title || '（タイトル未入力）'}</h5>
                </div>
                <div className="p-6 flex-1 space-y-4">
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{content || '本文がここに入ります。'}</p>
                </div>
                <div className="p-6 border-t border-slate-50">
                  <div className="w-full bg-blue-600 h-12 rounded-2xl flex items-center justify-center text-white text-xs font-black">確認しました</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* モーダル：既読詳細 */}
        {showReadList.show && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowReadList({ ...showReadList, show: false })}>
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h4 className="text-xl font-black italic">閲覧ユーザー</h4>
                <button onClick={() => setShowReadList({ ...showReadList, show: false })} className="text-slate-400">✕</button>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                {showReadList.users.length > 0 ? showReadList.users.map((u, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <span className="font-bold text-sm">{u.profiles?.room_number || '---'}号室 {u.profiles?.full_name}様</span>
                    <span className="text-[9px] font-bold text-slate-400">{new Date(u.read_at).toLocaleString()}</span>
                  </div>
                )) : <p className="text-center text-slate-400 py-10">既読データなし</p>}
              </div>
            </div>
          </div>
        )}

        <footer className="mt-16 text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
          Posutto 管理コンソール v3.5
        </footer>
      </div>
    </div>
  );
}