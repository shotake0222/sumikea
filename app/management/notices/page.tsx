'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { uploadImage } from '../../../lib/upload';

export default function ManagementNoticePage() {
  const router = useRouter();
  const [managedProperties, setManagedProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedPropData, setSelectedPropData] = useState<any>(null); // 選択中の物件詳細情報
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('info');
  
  // --- 状態管理 ---
  const [isPermanent, setIsPermanent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAuthAndData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login?type=manager'); return; }

        // プロフィールからロールを取得
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = profile?.role?.toUpperCase() || 'USER';
        const isAuthorized = role === 'ADMIN' || role === 'MANAGER';
        if (!isAuthorized) { router.push('/login?type=manager'); return; }
        
        let propertyList: any[] = [];
        
        if (role === 'ADMIN') {
          // 【運営会社（俺）用】全物件を取得
          const { data: allProps, error: propError } = await supabase
            .from('properties')
            .select('id, name, join_code');
          
          if (allProps) {
            propertyList = allProps.map(p => ({
              property_id: p.id,
              properties: { name: p.name, join_code: p.join_code }
            }));
          }
        } else {
          // 【一般管理会社用】担当物件のみ取得
          const { data: managerProps } = await supabase
            .from('property_managers')
            .select('property_id, properties(name, join_code)')
            .eq('user_id', user.id);
          if (managerProps) propertyList = managerProps;
        }
        
        if (propertyList.length > 0) {
          setManagedProperties(propertyList);
          // 初期状態では何も選択せず、ユーザーに選ばせる（または最初の1つをセット）
          setSelectedProperty(propertyList[0].property_id);
          setSelectedPropData(propertyList[0].properties);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuthAndData();
  }, [router]);

  // 物件選択切り替え時の連動（ここが重要）
  const handlePropertyChange = (id: string) => {
    setSelectedProperty(id);
    const found = managedProperties.find(p => p.property_id === id);
    if (found) {
      setSelectedPropData(found.properties);
    }
  };

  const handlePrint = () => {
    if (!selectedProperty) return alert('印刷する物件を選択してください');
    window.print();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return alert('投稿先の物件を選択してください');
    
    setIsSubmitting(true);
    const { error } = await supabase.from('property_notifications').insert({
      property_id: selectedProperty,
      title,
      content,
      category,
      pdf_url: pdfUrl,
      is_permanent: isPermanent,
      expires_at: isPermanent ? null : new Date(expiresAt).toISOString(),
      status: 'published'
    });

    if (!error) {
      alert('デジタル掲示板を更新しました');
      setTitle(''); setContent(''); setPdfUrl('');
    } else {
      alert('エラー: ' + error.message);
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center animate-pulse">
        <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initialising Console...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, header, form, .no-print, .property-selector-box { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .print-card { 
            border: 5px solid #000 !important; 
            padding: 60px !important; 
            border-radius: 0 !important;
            margin: 0 !important;
            height: 90vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
        }
        .print-only { display: none; }
      `}} />

      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 no-print">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Admin / Manager Mode</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">物件管理コンソール</h1>
          </div>
          
          {/* 物件セレクター（一番目立つ場所に配置） */}
          <div className="w-full md:w-72 no-print property-selector-box">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">操作対象の物件を切り替え</label>
            <select 
              className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm transition-all"
              value={selectedProperty}
              onChange={(e) => handlePropertyChange(e.target.value)}
            >
              {managedProperties.map((p, i) => (
                <option key={p.property_id || i} value={p.property_id}>{p.properties?.name}</option>
              ))}
            </select>
          </div>
        </header>

        {/* 1. 招待コードセクション */}
        <section className="mb-12 no-print">
          <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter">住民招待コード</h2>
                  <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Protocol: Resident Onboarding</p>
                </div>
                <button 
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  🖨️ 掲示用PDFを印刷
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    選択中の物件固有の招待コードです。住民が登録時に入力することで、この物件の掲示板が利用可能になります。
                  </p>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Current Active Property</p>
                    <p className="text-lg font-black text-white">{selectedPropData?.name || '---'}</p>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] p-8 text-center shadow-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Invitation Code</p>
                  <p className="text-4xl font-black text-slate-900 tracking-[0.3em] ml-[0.3em]">
                    {selectedPropData?.join_code || '----'}
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 text-[10rem] font-black italic opacity-5 text-white select-none">CODE</div>
          </div>
        </section>

        {/* 印刷用レイアウト */}
        <div className="print-only">
          <div className="print-card">
            <div className="text-center">
              <h1 className="text-5xl font-black mb-10 tracking-tighter">{selectedPropData?.name}</h1>
              <div className="w-24 h-1 bg-black mx-auto mb-10"></div>
              <p className="text-2xl mb-12 font-bold leading-tight">
                入居者専用アプリ「ぽすっと」を導入しました。<br/>
                以下のコードで初期設定を完了してください。
              </p>
              <div className="border-[12px] border-black p-12 inline-block mb-12">
                <p className="text-sm font-black mb-4 uppercase tracking-widest">招待コード</p>
                <p className="text-8xl font-black tracking-[0.2em] ml-[0.2em]">{selectedPropData?.join_code}</p>
              </div>
              <p className="text-lg font-black mt-8">
                [ ぽすっと - 暮らしを、もっと、ぽすっと。 ]
              </p>
            </div>
          </div>
        </div>

        {/* 2. 掲示板投稿フォーム */}
        <div className="no-print">
          <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl shadow-slate-200/60 border border-slate-100 space-y-10">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-3 tracking-widest uppercase">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xs shadow-lg shadow-blue-200">＋</span> 
              デジタル掲示板 新規投稿
            </h2>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">投稿カテゴリー</label>
                <div className="flex bg-slate-50 p-1.5 rounded-3xl">
                  {['info', 'urgent', 'rule'].map((cat) => (
                    <button key={cat} type="button" onClick={() => setCategory(cat)}
                      className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${category === cat ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
                      {cat === 'info' ? '通常' : cat === 'urgent' ? '重要' : '規約'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">掲示期間設定</label>
                <div className="bg-slate-50 p-1.5 rounded-3xl flex items-center h-[52px]">
                   <button type="button" onClick={() => setIsPermanent(!isPermanent)}
                    className={`flex-1 h-full rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${isPermanent ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
                    {isPermanent ? '✅ 常設表示' : '期間指定'}
                  </button>
                  {!isPermanent && (
                    <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                    className="flex-1 bg-transparent border-none px-4 font-bold text-[10px] outline-none" />
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">タイトル</label>
                 <input className="w-full bg-slate-50 border-none p-6 rounded-3xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：排水管清掃のお知らせ" required />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">本文</label>
                  <textarea className="w-full bg-slate-50 border-none p-6 rounded-[2rem] h-56 text-slate-700 outline-none resize-none leading-relaxed focus:ring-2 focus:ring-blue-100 transition-all"
                    value={content} onChange={(e) => setContent(e.target.value)} placeholder="住民に伝えたい内容を入力してください..." required />
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">添付ファイル</label>
                  <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] h-56 cursor-pointer transition-all ${pdfUrl ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}>
                    {uploading ? <div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full" /> : 
                      <div className="text-center p-4">
                        <span className="text-3xl mb-2 block">{pdfUrl ? '📄' : '📎'}</span>
                        <p className="text-[9px] font-black uppercase tracking-tighter">{pdfUrl ? 'PDF Attached' : 'Upload PDF (Max 5MB)'}</p>
                        {pdfUrl && <p className="text-[8px] text-blue-500 mt-2 truncate max-w-[100px]">Linked!</p>}
                      </div>
                    }
                    <input type="file" className="hidden" onChange={handlePdfUpload} accept="application/pdf" />
                  </label>
                </div>
              </div>
            </section>

            <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-7 rounded-[2.5rem] font-black text-xl hover:bg-blue-600 transition shadow-2xl shadow-slate-300 active:scale-[0.98] disabled:opacity-50">
              {isSubmitting ? 'PROCESSING...' : 'デジタル掲示板に配信開始'}
            </button>
          </form>
        </div>

        <footer className="mt-16 text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.4em] no-print">
          Posutto Management Interface v2.0
        </footer>
      </div>
    </div>
  );
}