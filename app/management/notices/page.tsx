'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { uploadImage } from '../../../lib/upload';

export default function ManagementNoticePage() {
  const router = useRouter();
  const [managedProperties, setManagedProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  
  // 配信設定用
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('campaign');
  const [targetAudience, setTargetAudience] = useState('resident'); 
  
  const [isPermanent, setIsPermanent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState(''); // 表示用ファイル名
  const [uploading, setUploading] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAuthAndData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login?type=manager'); return; }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const role = profile?.role?.toUpperCase() || 'USER';
        const isAuthorized = role === 'ADMIN' || role === 'MANAGER';
        if (!isAuthorized) { router.push('/login?type=manager'); return; }
        
        let propertyList: any[] = [];
        if (role === 'ADMIN') {
          const { data: allProps } = await supabase.from('properties').select('id, name');
          if (allProps) {
            propertyList = allProps.map(p => ({
              property_id: p.id,
              properties: { name: p.name }
            }));
          }
        } else {
          const { data: managerProps } = await supabase.from('property_managers').select('property_id, properties(name)').eq('user_id', user.id);
          if (managerProps) propertyList = managerProps;
        }
        
        if (propertyList.length > 0) {
          setManagedProperties(propertyList);
          setSelectedProperty(propertyList[0].property_id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuthAndData();
  }, [router]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // ✅ 修正: 日本語ファイル名エラー回避済みの新uploadImageを呼び出し
      // 引数: ファイル, バケット名, フォルダ名
      const url = await uploadImage(file, 'sumikea-images', 'management-docs');
      
      setPdfUrl(url);
      setUploadedFileName(file.name); // 画面表示用に元の名前を保持
    } catch (err: any) {
      console.error("アップロード詳細エラー:", err);
      alert(`アップロードに失敗しました。詳細: ${err.message || 'ファイル名に特殊な文字が含まれている可能性があります。'}`);
    } finally {
      setUploading(false);
      e.target.value = ''; // インプットをクリア
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return alert('対象を選択してください');
    setIsSubmitting(true);
    
    const { error } = await supabase.from('property_notifications').insert({
      property_id: selectedProperty,
      title,
      content,
      category,
      target_audience: targetAudience,
      pdf_url: pdfUrl,
      is_permanent: isPermanent,
      expires_at: isPermanent ? null : new Date(expiresAt).toISOString(),
      status: 'published'
    });

    if (!error) {
      alert('配信・更新が完了しました');
      setTitle(''); setContent(''); setPdfUrl(''); setUploadedFileName('');
    } else {
      alert('エラー: ' + error.message);
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center animate-pulse">
        <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initialising Admin Console...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Ad & Notice Management</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
              Posutto <span className="text-blue-600">Ad Console</span>
            </h1>
          </div>
          
          <div className="w-full md:w-72">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">配信対象物件（エリア）</label>
            <select 
              className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm transition-all appearance-none cursor-pointer"
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
            >
              {managedProperties.map((p, i) => (
                <option key={p.property_id || i} value={p.property_id}>{p.properties?.name}</option>
              ))}
            </select>
          </div>
        </header>

        {/* メインフォーム */}
        <form onSubmit={handleSubmit} className="bg-white rounded-[4rem] p-8 md:p-16 shadow-2xl shadow-slate-200/60 border border-slate-100 space-y-12">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-50 pb-10">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-4 tracking-tighter">
              <span className="w-12 h-12 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center text-lg shadow-xl shadow-slate-200">🚀</span> 
              新規広告・お知らせの作成
            </h2>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
              {[
                { id: 'resident', label: '住民' },
                { id: 'shop', label: '店舗' },
                { id: 'posting', label: 'ポスティング社' },
                { id: 'manager', label: '管理会社' }
              ].map((t) => (
                <button key={t.id} type="button" onClick={() => setTargetAudience(t.id)}
                  className={`px-5 py-3 rounded-xl text-[10px] font-black transition-all ${targetAudience === t.id ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">広告カテゴリー</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'campaign', label: 'キャンペーン', icon: '🎁' },
                  { id: 'urgent', label: '重要・緊急', icon: '🚨' },
                  { id: 'maintenance', label: 'メンテナンス', icon: '🔧' },
                  { id: 'local', label: '地域情報', icon: '📍' }
                ].map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl text-[11px] font-bold transition-all border-2 ${category === cat.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                    <span>{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">表示スケジュール</label>
              <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4">
                <button type="button" onClick={() => setIsPermanent(!isPermanent)}
                  className={`w-full py-4 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${isPermanent ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                  {isPermanent ? '✅ 無期限（常設）で表示する' : '期間を指定して表示する'}
                </button>
                {!isPermanent && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-slate-400 ml-1">掲載終了日時</span>
                    <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full bg-white border-none p-4 rounded-xl font-bold text-sm outline-none shadow-sm" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">配信タイトル（ポップアップ見出し）</label>
               <input className="w-full bg-slate-50 border-none p-7 rounded-[2rem] text-xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-300"
                value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：【特報】近隣スーパーのタイムセール情報" required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">詳細内容・説明文</label>
                <textarea className="w-full bg-slate-50 border-none p-8 rounded-[2.5rem] h-64 text-slate-700 outline-none resize-none leading-relaxed focus:ring-4 focus:ring-blue-100 transition-all text-lg font-medium"
                  value={content} onChange={(e) => setContent(e.target.value)} placeholder="ユーザーに伝えたい詳細情報を入力してください。" required />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">バナー・資料添付</label>
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] h-64 cursor-pointer transition-all ${pdfUrl ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                  {uploading ? <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" /> : 
                    <div className="text-center p-6">
                      <span className="text-5xl mb-4 block">{pdfUrl ? '🖼️' : '📁'}</span>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {pdfUrl ? 'READY TO POST' : 'Upload Image/PDF'}
                      </p>
                      {uploadedFileName && (
                        <p className="mt-2 text-[10px] font-bold text-blue-600 truncate max-w-[150px]">
                          {uploadedFileName}
                        </p>
                      )}
                    </div>
                  }
                  <input type="file" className="hidden" onChange={handlePdfUpload} accept="application/pdf,image/*" />
                </label>
                {pdfUrl && (
                  <button type="button" onClick={() => {setPdfUrl(''); setUploadedFileName('');}} className="text-[9px] font-black text-red-500 uppercase tracking-widest w-full text-center hover:underline">
                    ファイルを削除する
                  </button>
                )}
              </div>
            </div>
          </div>

          <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-10 rounded-[3rem] font-black text-2xl hover:bg-blue-600 transition shadow-2xl active:scale-[0.98] disabled:opacity-50 uppercase tracking-tighter italic">
            {isSubmitting ? 'Now Loading...' : '配信ターゲットへ送信！'}
          </button>
        </form>

        <footer className="mt-16 text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
          Posutto Central Ad-Hub Module v3.0
        </footer>
      </div>
    </div>
  );
}