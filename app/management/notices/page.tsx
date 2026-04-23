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

        const role = user?.user_metadata?.role?.toUpperCase() || 'USER';
        const isAuthorized = role === 'ADMIN' || role === 'MANAGER';
        if (!isAuthorized) { router.push('/login?type=manager'); return; }
        
        let propertyList: any[] = [];
        if (role === 'ADMIN') {
          // 管理者の場合は物件コード（join_code）も含めて取得
          const { data: allProps } = await supabase.from('properties').select('id, name, join_code');
          propertyList = allProps?.map(p => ({ property_id: p.id, properties: { name: p.name, join_code: p.join_code } })) || [];
        } else {
          const { data: managerProps } = await supabase
            .from('property_managers')
            .select('property_id, properties(name, join_code)')
            .eq('user_id', user.id);
          if (managerProps) propertyList = managerProps;
        }
        
        if (propertyList.length > 0) {
          setManagedProperties(propertyList);
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

  // 物件選択切り替え時の連動
  const handlePropertyChange = (id: string) => {
    setSelectedProperty(id);
    const prop = managedProperties.find(p => p.property_id === id);
    setSelectedPropData(prop?.properties || null);
  };

  // 印刷処理
  const handlePrint = () => {
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
      alert('失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return alert('物件を選択してください');
    
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
      alert('掲示板を更新しました');
      setTitle(''); setContent(''); setPdfUrl('');
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="p-10 font-black animate-pulse">LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, header, form, .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-card { border: 2px solid #000 !important; padding: 40px !important; border-radius: 0 !important; }
        }
        .print-only { display: none; }
      `}} />

      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 no-print">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Property Manager Console</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">管理会社ダッシュボード</h1>
          </div>
        </header>

        {/* 1. 招待コードセクション（印刷用） */}
        <section className="mb-12 no-print">
          <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter">住民招待コードの発行</h2>
                  <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Resident Invitation Protocol</p>
                </div>
                <button 
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2"
                >
                  🖨️ 印刷して配布
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed font-bold">
                    このコードは物件ごとに固有です。住民が「ぽすっと」アプリ登録時に入力することで、正しい掲示板が自動的に紐付けられます。ポスト投函用チラシとして印刷してください。
                  </p>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Target Property</p>
                    <p className="text-lg font-black">{selectedPropData?.name || '物件を選択してください'}</p>
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] p-8 text-center shadow-inner">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Your Invite Code</p>
                  <p className="text-4xl font-black text-slate-900 tracking-[0.3em] ml-[0.3em]">
                    {selectedPropData?.join_code || '----'}
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 text-[10rem] font-black italic opacity-5 text-white">CODE</div>
          </div>
        </section>

        {/* 印刷用レイアウト（通常は見えない） */}
        <div className="print-only">
          <div className="print-card border-4 border-black p-16 text-center">
            <h1 className="text-4xl font-black mb-8">{selectedPropData?.name} 住民の皆様へ</h1>
            <p className="text-xl mb-12 font-bold leading-relaxed">
              当マンション専用アプリ「ぽすっと」の導入が完了しました。<br/>
              以下の招待コードを入力して、デジタル掲示板をご利用ください。
            </p>
            <div className="border-8 border-black p-12 inline-block mb-12">
              <p className="text-sm font-black mb-4">招待コード</p>
              <p className="text-7xl font-black tracking-widest">{selectedPropData?.join_code}</p>
            </div>
            <p className="text-sm font-bold text-slate-600">
              ※このコードは当物件にお住まいの方以外には教えないでください。
            </p>
          </div>
        </div>

        {/* 2. 掲示板投稿フォーム */}
        <div className="no-print">
          <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-slate-100 space-y-10">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2 tracking-widest uppercase">
              <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-xs">GO</span> 掲示板への新規投稿
            </h2>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">編集対象物件</label>
                <select 
                  className="w-full bg-slate-50 border-none p-5 rounded-3xl font-bold text-slate-700 outline-none"
                  value={selectedProperty}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  required
                >
                  {managedProperties.map((p, i) => (
                    <option key={p.property_id || i} value={p.property_id}>{p.properties?.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">カテゴリー</label>
                <div className="flex bg-slate-50 p-1.5 rounded-3xl">
                  {['info', 'urgent', 'rule'].map((cat) => (
                    <button key={cat} type="button" onClick={() => setCategory(cat)}
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${category === cat ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>
                      {cat === 'info' ? '通常' : cat === 'urgent' ? '重要' : '規約'}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-slate-50 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setIsPermanent(!isPermanent)}
                  className={`w-14 h-8 rounded-full relative transition-all ${isPermanent ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isPermanent ? 'left-7' : 'left-1'}`} />
                </button>
                <span className="text-[11px] font-black text-slate-700 uppercase">常設の注意事項にする</span>
              </div>
              {!isPermanent && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase">掲示終了</span>
                  <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                    className="bg-white border-none p-3 rounded-xl font-bold text-xs shadow-inner outline-none" />
                </div>
              )}
            </section>

            <section className="space-y-6">
              <input className="w-full bg-slate-50 border-none p-5 rounded-3xl font-bold text-slate-700 outline-none"
                value={title} onChange={(e) => setTitle(e.target.value)} placeholder="掲示板の見出しを入力" required />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <textarea className="md:col-span-2 w-full bg-slate-50 border-none p-6 rounded-[2rem] h-48 text-slate-700 outline-none resize-none leading-relaxed"
                  value={content} onChange={(e) => setContent(e.target.value)} placeholder="内容を詳しく入力..." required />
                
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] cursor-pointer transition ${pdfUrl ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                  {uploading ? <div className="animate-spin h-5 w-5 border-b-2 border-blue-600 rounded-full" /> : 
                    <div className="text-center">
                      <span className="text-2xl">{pdfUrl ? '✅' : '📎'}</span>
                      <p className="text-[8px] font-black mt-2 uppercase">{pdfUrl ? 'PDF Linked' : 'Add PDF'}</p>
                    </div>
                  }
                  <input type="file" className="hidden" onChange={handlePdfUpload} accept="application/pdf" />
                </label>
              </div>
            </section>

            <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-lg hover:bg-blue-600 transition shadow-2xl active:scale-95">
              {isSubmitting ? 'SENDING...' : 'デジタル掲示板に投稿'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}