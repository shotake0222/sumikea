'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { uploadImage } from '../../../lib/upload';

export default function ManagementNoticePage() {
  const router = useRouter();
  
  // 状態管理
  const [managedProperties, setManagedProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  
  // 配信設定用
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('campaign');
  const [targetAudience, setTargetAudience] = useState('resident');
  
  const [isPermanent, setIsPermanent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAuthAndData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login?type=manager'); return; }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        const role = profile?.role?.toUpperCase() || 'USER';
        
        // 管理会社（MANAGER）または管理者（ADMIN）のみ許可
        if (role !== 'ADMIN' && role !== 'MANAGER') { 
          router.push('/login?type=manager'); 
          return; 
        }
        
        let propertyList: any[] = [];
        if (role === 'ADMIN') {
          // 全物件（管理者用）
          const { data: allProps } = await supabase.from('properties').select('id, name');
          if (allProps) {
            propertyList = allProps.map(p => ({
              property_id: p.id,
              properties: { name: p.name }
            }));
          }
        } else {
          // 担当物件のみ
          const { data: managerProps } = await supabase
            .from('property_managers')
            .select('property_id, properties(name)')
            .eq('user_id', user.id);
          if (managerProps) propertyList = managerProps;
        }
        
        if (propertyList.length > 0) {
          setManagedProperties(propertyList);
          setSelectedProperty(propertyList[0].property_id);
          fetchNoticeHistory(propertyList[0].property_id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuthAndData();
  }, [router]);

  // 物件ごとの履歴取得
  const fetchNoticeHistory = async (propId: string) => {
    const { data } = await supabase
      .from('property_notifications')
      .select('*')
      .eq('property_id', propId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentNotices(data);
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
    if (!selectedProperty) return alert('対象物件を選択してください');
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
      alert('配信が完了しました');
      setTitle(''); setContent(''); setPdfUrl('');
      fetchNoticeHistory(selectedProperty);
    } else {
      alert('エラー: ' + error.message);
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center animate-pulse">
        <div className="w-12 h-12 bg-blue-600/20 rounded-full mx-auto mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initialising Manager Console...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Property Admin Suite</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
              Management <span className="text-blue-600">Console</span>
            </h1>
          </div>
          
          <div className="w-full lg:w-96 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="flex-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block ml-1">操作対象物件</label>
              <select 
                className="w-full bg-transparent font-bold text-slate-700 outline-none cursor-pointer text-lg"
                value={selectedProperty}
                onChange={(e) => {
                  setSelectedProperty(e.target.value);
                  fetchNoticeHistory(e.target.value);
                }}
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
          {/* メイン入力エリア */}
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="bg-white rounded-[3.5rem] p-8 md:p-14 shadow-2xl shadow-slate-200/40 border border-slate-100 space-y-12">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-50 pb-10">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-4 tracking-tighter italic">
                  <span className="w-12 h-12 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center text-lg shadow-xl shadow-blue-200">✉️</span> 
                  SEND NOTIFICATION
                </h2>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
                  {[
                    { id: 'resident', label: '住民' },
                    { id: 'shop', label: '店舗' },
                    { id: 'posting', label: '業者' },
                  ].map((t) => (
                    <button key={t.id} type="button" onClick={() => setTargetAudience(t.id)}
                      className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all ${targetAudience === t.id ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                      {t.label}宛
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">配信カテゴリー</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'urgent', label: '緊急連絡', icon: '🚨' },
                      { id: 'maintenance', label: '工事・点検', icon: '🔧' },
                      { id: 'campaign', label: 'お知らせ', icon: '📢' },
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
                  <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100">
                    <button type="button" onClick={() => setIsPermanent(!isPermanent)}
                      className={`w-full py-4 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${isPermanent ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                      {isPermanent ? '✅ 無期限（常設）表示' : '期間を指定して表示する'}
                    </button>
                    {!isPermanent && (
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-bold text-slate-400 ml-1">自動掲載終了日時</span>
                        <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                          className="w-full bg-white border-none p-4 rounded-xl font-bold text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-100 transition-all" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">配信タイトル</label>
                  <input className="w-full bg-slate-50 border-none p-7 rounded-[2rem] text-xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                    value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：【重要】4月10日 エレベーター点検のお知らせ" required />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">詳細内容（アプリ内で表示）</label>
                    <textarea className="w-full bg-slate-50 border-none p-8 rounded-[2.5rem] h-64 text-slate-700 outline-none resize-none leading-relaxed focus:ring-4 focus:ring-blue-50 transition-all text-lg font-medium"
                      value={content} onChange={(e) => setContent(e.target.value)} placeholder="住民に伝えたい具体的な内容を入力してください..." required />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">資料・写真添付</label>
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] h-64 cursor-pointer transition-all ${pdfUrl ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                      {uploading ? <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" /> : 
                        <div className="text-center p-6">
                          <span className="text-5xl mb-4 block">{pdfUrl ? '📄' : '📤'}</span>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{pdfUrl ? 'UPLOADED' : 'Drag & Drop'}</p>
                        </div>
                      }
                      <input type="file" className="hidden" onChange={handlePdfUpload} accept="application/pdf,image/*" />
                    </label>
                  </div>
                </div>
              </div>

              <button disabled={isSubmitting} className="w-full bg-blue-600 text-white py-10 rounded-[3rem] font-black text-2xl hover:bg-slate-900 transition-all shadow-2xl shadow-blue-200 active:scale-[0.98] disabled:opacity-50 uppercase tracking-tighter italic">
                {isSubmitting ? 'SENDING...' : 'CONFIRM & SEND NOW'}
              </button>
            </form>
          </div>

          {/* 右サイド：履歴リスト */}
          <div className="w-full xl:w-96 space-y-6">
            <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100 sticky top-10">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic">RECENT LOGS</h3>
                <span className="text-[9px] bg-slate-100 px-2 py-1 rounded font-bold">LATEST 5</span>
              </div>
              
              <div className="space-y-8">
                {recentNotices.map((notice) => (
                  <div key={notice.id} className="group border-b border-slate-50 pb-6 last:border-0">
                    <div className="flex gap-4 items-start">
                      <span className="text-lg bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition">
                        {notice.category === 'urgent' ? '🚨' : '📢'}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800 line-clamp-1 mb-1">{notice.title}</p>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                          <span className="uppercase">{notice.target_audience}宛</span>
                          <span>•</span>
                          <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {recentNotices.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">No logs found</p>
                  </div>
                )}
              </div>

              <button className="w-full mt-10 py-5 border-2 border-slate-50 rounded-2xl text-[10px] font-black text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest">
                View All History →
              </button>
            </div>
          </div>
        </div>

        <footer className="mt-16 text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
          Posutto Central Ad-Hub Module v3.1 / {selectedProperty ? 'Property Connected' : 'System Standby'}
        </footer>
      </div>
    </div>
  );
}