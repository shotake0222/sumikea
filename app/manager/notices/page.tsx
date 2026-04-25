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

  const [showPreview, setShowPreview] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // --- 初期データ取得 (Ad Consoleの動くロジックをベースに統合) ---
  useEffect(() => {
    const fetchAuthAndData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login?type=manager'); return; }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const role = profile?.role?.toUpperCase() || 'USER';
        
        if (role !== 'ADMIN' && role !== 'MANAGER') { router.push('/login?type=manager'); return; }
        
        let propertyList: any[] = [];
        if (role === 'ADMIN') {
          // invite_codeも含めて取得
          const { data: allProps } = await supabase.from('properties').select('id, name, invite_code');
          if (allProps) {
            propertyList = allProps.map(p => ({
              property_id: p.id,
              properties: { name: p.name, invite_code: p.invite_code }
            }));
          }
        } else {
          // invite_codeも含めて結合取得
          const { data: managerProps } = await supabase
            .from('property_managers')
            .select('property_id, properties(name, invite_code)')
            .eq('user_id', user.id);
          if (managerProps) propertyList = managerProps;
        }
        
        if (propertyList.length > 0) {
          setManagedProperties(propertyList);
          // Ad Consoleと同様に初期値をセット
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
    if (found) {
      setSelectedPropertyData(found.properties);
      fetchNoticeHistory(propId);
    }
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
      alert(targetStatus === 'draft' ? '下書きとして保存しました' : '配信設定が完了しました');
      setTitle(''); setContent(''); setPdfUrl(''); fetchNoticeHistory(selectedProperty);
    } else {
      alert('エラー: ' + error.message);
    }
    setIsSubmitting(false);
  };

  // QRコード生成URLの定義
  const getQrCodeUrl = () => {
    const targetUrl = "https://posutto.vercel.app/login?type=user";
    return `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(targetUrl)}&choe=UTF-8`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-slate-400">
      LOADING...
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
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest italic">Now Editing</span>
                <h1 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter italic uppercase">
                  {selectedPropertyData?.name || '---'}
                </h1>
              </div>
              <p className="text-slate-400 font-bold text-xl flex items-center gap-2">
                <span className="text-2xl text-blue-600">🏢</span> 住民お知らせコンソール
              </p>
            </div>
            
            <div className="w-full lg:w-auto">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-blue-50 flex items-center gap-6 min-w-[360px]">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] block mb-2 ml-1">操作物件を切り替える</label>
                  <select 
                    className="w-full bg-slate-50 p-4 rounded-2xl font-black text-slate-700 outline-none cursor-pointer text-lg focus:ring-2 focus:ring-blue-500 appearance-none"
                    value={selectedProperty}
                    onChange={(e) => handlePropertyChange(e.target.value)}
                  >
                    {managedProperties.map((p, i) => (
                      <option key={p.property_id || i} value={p.property_id}>{p.properties?.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-14 h-14 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-2xl shadow-lg">🔄</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 md:p-10 rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center gap-10 border-b-[12px] border-slate-800">
            <button 
              onClick={() => setShowPrintModal(true)}
              className="bg-blue-600 text-white w-24 h-24 md:w-32 md:h-32 rounded-[3rem] shadow-lg hover:bg-white hover:text-blue-600 transition-all flex flex-col items-center justify-center gap-1 group shrink-0"
            >
              <span className="text-4xl md:text-5xl group-hover:scale-110 transition-transform">🖨️</span>
              <span className="text-[10px] font-black uppercase tracking-tighter">案内印刷</span>
            </button>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-black mb-3 tracking-tight italic">
                「{selectedPropertyData?.name || '物件を選択してください'}」の住民登録用チラシを作成
              </h2>
              <p className="text-slate-400 text-base font-bold leading-relaxed max-w-2xl">
                招待コード「{selectedPropertyData?.invite_code || '------'}」が記載された専用チラシを出力します。<br />
                印刷して共用部の掲示板や、各住戸のポストへ投函して登録を案内してください。
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="bg-white rounded-[4rem] p-8 md:p-14 shadow-2xl border border-slate-50 space-y-12">
              <div className="flex justify-between items-center border-b border-slate-50 pb-8">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  {[{ id: 'published', label: '即時配信' }, { id: 'scheduled', label: '予約配信' }, { id: 'draft', label: '下書き' }].map((s) => (
                    <button key={s.id} type="button" onClick={() => setStatus(s.id as any)}
                      className={`px-8 py-3 rounded-xl text-[11px] font-black transition-all ${status === s.id ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">カテゴリー</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[{ id: 'urgent', label: '緊急連絡', icon: '🚨' }, { id: 'maintenance', label: '工事・点検', icon: '🔧' }, { id: 'campaign', label: 'お知らせ', icon: '📢' }, { id: 'local', label: '地域情報', icon: '📍' }].map((cat) => (
                      <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-3 p-5 rounded-[2rem] text-xs font-bold border-2 transition-all ${category === cat.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                        <span className="text-xl">{cat.icon}</span> {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">掲載期間設定</label>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-4 border border-slate-100">
                    <button type="button" onClick={() => setIsPermanent(!isPermanent)}
                      className={`w-full py-4 rounded-2xl text-[10px] font-black transition-all ${isPermanent ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>
                      {isPermanent ? '✅ 常にトップに固定' : '掲載終了日時を指定する'}
                    </button>
                    {!isPermanent && (
                      <input type="datetime-local" className="w-full p-4 rounded-xl border-none font-bold text-sm shadow-sm outline-none" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                <input className="w-full bg-slate-50 border-none p-8 rounded-[2.5rem] text-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-200"
                    value={title} onChange={(e) => setTitle(e.target.value)} placeholder="配信タイトルを入力してください" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <textarea className="md:col-span-2 w-full bg-slate-50 border-none p-10 rounded-[3rem] h-80 text-slate-700 outline-none resize-none leading-relaxed focus:ring-4 focus:ring-blue-100 text-lg font-medium"
                      value={content} onChange={(e) => setContent(e.target.value)} placeholder="配信する本文を入力..." />
                  
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] h-80 cursor-pointer transition-all ${pdfUrl ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                    {uploading ? <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" /> : 
                      <div className="text-center p-6">
                        <span className="text-6xl mb-4 block">{pdfUrl ? '📄' : '📤'}</span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{pdfUrl ? '添付済み' : '資料を添付'}</p>
                      </div>
                    }
                    <input type="file" className="hidden" onChange={handlePdfUpload} accept="application/pdf,image/*" />
                  </label>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-10 rounded-[3.5rem] font-black text-3xl hover:bg-slate-900 transition-all shadow-2xl shadow-blue-200 disabled:opacity-50 uppercase tracking-tighter italic">
                {isSubmitting ? '処理中...' : status === 'draft' ? '下書きを保存' : '住民へ一斉配信'}
              </button>
            </form>
          </div>

          <div className="w-full xl:w-96 space-y-6">
            <div className="bg-white rounded-[4rem] p-10 shadow-sm border border-slate-100 sticky top-10">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic mb-10">最近の配信履歴</h3>
              <div className="space-y-12">
                {recentNotices.length > 0 ? recentNotices.map((notice) => {
                  const readRate = notice.total_residents > 0 ? Math.round((notice.actual_read_count / notice.total_residents) * 100) : 0;
                  return (
                    <div key={notice.id} className="group border-b border-slate-50 pb-8 last:border-0">
                      <div className="flex gap-4 items-start mb-6">
                        <span className="text-lg bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                          {notice.category === 'urgent' ? '🚨' : '📢'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-black text-slate-800 line-clamp-2 leading-snug">{notice.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(notice.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-wider">Read Status</span>
                          <span className="text-xs font-black text-blue-600">{notice.actual_read_count} / {notice.total_residents}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${readRate}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                }) : <p className="text-center text-slate-300 font-bold py-10">配信履歴がありません</p>}
              </div>
            </div>
          </div>
        </div>

        {/* 印刷用モーダル */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowPrintModal(false)}>
            <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-end mb-6 gap-4 no-print">
                <button onClick={() => window.print()} className="bg-blue-600 text-white px-10 py-4 rounded-full font-black shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-3 scale-110">
                   <span>🖨️</span> 印刷を開始する
                </button>
                <button onClick={() => setShowPrintModal(false)} className="bg-white/10 text-white px-8 py-4 rounded-full font-black backdrop-blur-md">閉じる</button>
              </div>

              <div id="print-area" className="bg-white p-12 md:p-20 shadow-2xl rounded-sm text-slate-900 border-[16px] border-blue-600">
                <div className="text-center mb-16">
                  <h2 className="text-6xl font-black italic tracking-tighter text-blue-600 mb-2 uppercase">Posutto</h2>
                  <p className="text-2xl font-bold tracking-[0.3em] text-slate-300 italic uppercase">Resident Portal</p>
                </div>

                <div className="border-y-[6px] border-slate-50 py-12 mb-12 text-center">
                  <p className="text-sm font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">対象物件名</p>
                  <h3 className="text-5xl font-black tracking-tight mb-12">{selectedPropertyData?.name || '---'}</h3>
                  
                  <div className="bg-slate-50 inline-block p-10 rounded-[4rem] border-2 border-slate-100">
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 italic">Your Invitation Code</p>
                    <div className="text-7xl font-black tracking-[0.25em] italic text-slate-900">
                      {selectedPropertyData?.invite_code || '---'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-20">
                  <div className="space-y-8">
                    <h4 className="text-3xl font-black border-l-[12px] border-blue-600 pl-6 mb-10 italic">ご利用の手順</h4>
                    <div className="space-y-6">
                      {[
                        { step: '1', title: 'スキャン', desc: '右記のQRコードをスマートフォンで読み取ります。' },
                        { step: '2', title: 'ログイン', desc: '画面の指示に従い、新規登録またはログインを行います。' },
                        { step: '3', title: 'コード入力', desc: 'ログイン後、上記の招待コードを入力して連携完了！' }
                      ].map((item) => (
                        <div key={item.step} className="flex gap-6 items-start">
                          <span className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-black shrink-0 text-xl shadow-lg">{item.step}</span>
                          <div>
                            <p className="font-black text-2xl">{item.title}</p>
                            <p className="text-sm text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center space-y-6">
                    <div className="p-8 bg-white border-[6px] border-slate-900 rounded-[3rem] shadow-2xl scale-110">
                      <img 
                        src={getQrCodeUrl()} 
                        alt="Resident Login QR" 
                        className="w-56 h-56 object-contain" 
                      />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] italic">Scan to access portal</p>
                  </div>
                </div>

                <div className="bg-blue-600 rounded-[4rem] p-12 text-white relative overflow-hidden shadow-xl">
                  <h4 className="text-center text-2xl font-black mb-10 italic">マイページで、暮らしをもっとスマートに。</h4>
                  <div className="grid grid-cols-3 gap-8 relative z-10">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl mb-4 backdrop-blur-md">📮</div>
                      <p className="text-sm font-black italic">デジタルポスト</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl mb-4 backdrop-blur-md">📢</div>
                      <p className="text-sm font-black italic">重要なお知らせ</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl mb-4 backdrop-blur-md">🗑️</div>
                      <p className="text-sm font-black italic">ゴミ収集カレンダー</p>
                    </div>
                  </div>
                </div>

                <div className="mt-16 text-center">
                  <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                    Managed by Posutto Digital Management System
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-20 text-[10px] text-slate-300 text-center font-black uppercase tracking-[0.5em] italic">Posutto Console Core v3.8</footer>
      </div>
    </div>
  );
}