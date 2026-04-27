'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { uploadImage } from '@/lib/upload';

export default function ManagementNoticePage() {
  const router = useRouter();
  
  // --- 状態管理 ---
  const [managedProperties, setManagedProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedPropertyData, setSelectedPropertyData] = useState<any>(null);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('campaign');
  const [targetAudience] = useState('resident');
  const [status, setStatus] = useState<'published' | 'draft' | 'scheduled'>('published');
  
  const [isPermanent, setIsPermanent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  
  // 複数PDF対応のための状態
  const [pdfUrls, setPdfUrls] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, url: string}[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // --- 🌐 最強座標取得ロジック ---
  const getCoordinates = async (rawAddress: string) => {
    const normalized = rawAddress
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .replace(/[－ー－―ー−-]/g, '-')
      .replace(/[　]/g, ' ')
      .trim();

    const base = normalized.split(' ')[0];
    const searchPatterns = [
      normalized,
      base,
      base.replace(/-\d+$/, ''),
      base.replace(/-\d+$/, '').replace(/-\d+$/, ''),
      base.replace(/\d+.*$/, '')
    ];

    const uniquePatterns = Array.from(new Set(searchPatterns)).filter(p => p.length > 3);

    for (const query of uniquePatterns) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
          { headers: { 'User-Agent': 'PosuttoManager/1.3' } }
        );
        const data = await response.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error('Geocoder Error:', err);
      }
    }
    return { lat: null, lng: null };
  };

  // --- 初期データ取得 ---
  useEffect(() => {
    const fetchAuthAndData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login?type=manager'); return; }
        setCurrentUserId(user.id);

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const role = profile?.role?.toUpperCase() || 'USER';
        
        if (role !== 'ADMIN' && role !== 'MANAGER') { router.push('/login?type=manager'); return; }
        
        await refreshPropertyList(user.id, role);
      } catch (err) {
        console.error('データ取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuthAndData();
  }, [router]);

  const refreshPropertyList = async (userId: string, role: string, targetNewId?: string) => {
    let propertyList: any[] = [];
    if (role === 'ADMIN') {
      const { data: allProps } = await supabase.from('properties').select('id, name, invite_code');
      if (allProps) {
        propertyList = allProps.map(p => ({
          property_id: p.id,
          properties: p
        }));
      }
    } else {
      const { data: managerProps } = await supabase
        .from('property_managers')
        .select('property_id, properties(id, name, invite_code)')
        .eq('user_id', userId);
      if (managerProps) propertyList = managerProps;
    }
    
    setManagedProperties(propertyList);

    if (propertyList.length > 0) {
      const target = targetNewId 
        ? propertyList.find(p => p.property_id === targetNewId) 
        : propertyList[0];
      
      if (target) {
        setSelectedProperty(target.property_id);
        setSelectedPropertyData(target.properties);
        fetchNoticeHistory(target.property_id);
      }
    }
  };

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

  const handleRegisterProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName || !newPropAddress) return;
    setIsRegistering(true);

    try {
      const coords = await getCoordinates(newPropAddress);
      
      if (!coords.lat || !coords.lng) {
        const proceed = confirm(`住所の位置を特定できませんでした。このまま登録しますか？`);
        if (!proceed) { setIsRegistering(false); return; }
      }

      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data: newProp, error: propError } = await supabase
        .from('properties')
        .insert([{ 
          name: newPropName, 
          address: newPropAddress,
          invite_code: inviteCode,
          lat: coords.lat,
          lng: coords.lng
        }])
        .select()
        .single();

      if (propError) throw propError;

      const { error: managerError } = await supabase
        .from('property_managers')
        .insert([{ property_id: newProp.id, user_id: currentUserId }]);

      if (managerError) throw managerError;

      alert(`「${newPropName}」を登録しました。`);
      setNewPropName(''); setNewPropAddress(''); setIsRegisterModalOpen(false);
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUserId).single();
      await refreshPropertyList(currentUserId, profile?.role || 'MANAGER', newProp.id);

    } catch (err: any) {
      alert('物件登録エラー: ' + err.message);
    } finally {
      setIsRegistering(false);
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

  // 🎯 複数ファイルアップロード対応
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newUploadedFiles = [...uploadedFiles];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i], 'sumikea-images', 'management-docs');
        newUploadedFiles.push({ name: files[i].name, url: url });
      }
      setUploadedFiles(newUploadedFiles);
    } catch (err: any) {
      alert(`アップロード失敗: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return alert('物件を選択してください');
    setIsSubmitting(true);
    
    try {
        const finalTitle = category === 'urgent' && !title.includes('【重要】') ? `【重要】${title}` : title;
        // 複数URLをカンマ区切りで結合
        const combinedPdfUrls = uploadedFiles.map(f => f.url).join(',');

        const { error } = await supabase.from('property_notifications').insert({
          property_id: selectedProperty,
          title: finalTitle,
          content,
          category,
          target_audience: targetAudience,
          pdf_url: combinedPdfUrls, // 複数URL対応
          is_permanent: isPermanent,
          expires_at: isPermanent ? null : new Date(expiresAt).toISOString(),
          status: status
        });

        if (error) throw error;

        alert('住民へ配信しました！');
        setTitle(''); setContent(''); setUploadedFiles([]); 
        fetchNoticeHistory(selectedProperty);
    } catch (err: any) {
        alert('配信エラー: ' + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const getQrCodeUrl = () => {
    const baseUrl = "https://posutto.vercel.app/login?type=user";
    const targetUrl = selectedProperty ? `${baseUrl}&prop=${selectedProperty}` : baseUrl;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;
  };

  const displayInviteCode = selectedPropertyData?.invite_code || '------';

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-slate-400 italic">LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans text-slate-900">
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
              <div className="flex flex-wrap gap-4 items-center">
                <p className="text-slate-400 font-bold text-xl flex items-center gap-2">
                  <span className="text-2xl">🏢</span> 住民お知らせコンソール
                </p>
                <button onClick={() => setIsRegisterModalOpen(true)} className="bg-slate-900 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                  + 物件を追加登録
                </button>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-blue-50 flex items-center gap-6 min-w-[360px]">
              <div className="flex-1">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] block mb-2 ml-1">操作物件切替</label>
                <select className="w-full bg-slate-50 p-4 rounded-2xl font-black text-slate-700 outline-none cursor-pointer text-lg focus:ring-2 focus:ring-blue-500 appearance-none"
                    value={selectedProperty} onChange={(e) => handlePropertyChange(e.target.value)}>
                  {managedProperties.map((p, i) => (
                    <option key={p.property_id || i} value={p.property_id}>{p.properties?.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-14 h-14 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-2xl shadow-lg">🔄</div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 md:p-10 rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center gap-10">
            <button onClick={() => setShowPrintModal(true)} className="bg-blue-600 text-white w-24 h-24 md:w-32 md:h-32 rounded-[3rem] shadow-lg hover:bg-white hover:text-blue-600 transition-all flex flex-col items-center justify-center gap-1 group">
              <span className="text-4xl md:text-5xl group-hover:scale-110 transition-transform">🖨️</span>
              <span className="text-[10px] font-black uppercase">案内印刷</span>
            </button>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-black mb-3 tracking-tight italic">
                「{selectedPropertyData?.name || '---'}」の住民登録用チラシを出力
              </h2>
              <p className="text-slate-400 text-base font-bold">招待コード「{displayInviteCode}」が記載された専用チラシを出力します。</p>
            </div>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="bg-white rounded-[4rem] p-8 md:p-14 shadow-2xl border border-slate-50 space-y-12">
              <div className="flex justify-between items-center border-b border-slate-50 pb-8">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  {['published', 'scheduled', 'draft'].map((s) => (
                    <button key={s} type="button" onClick={() => setStatus(s as any)}
                      className={`px-8 py-3 rounded-xl text-[11px] font-black transition-all ${status === s ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
                      {s === 'published' ? '即時配信' : s === 'scheduled' ? '予約' : '下書き'}
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
                        className={`flex items-center gap-3 p-5 rounded-[2rem] text-xs font-bold border-2 transition-all ${category === cat.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-100 text-slate-400'}`}>
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
                      <input type="datetime-local" className="w-full p-4 rounded-xl border-none font-bold text-sm outline-none" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                <input className="w-full bg-slate-50 border-none p-8 rounded-[2.5rem] text-2xl font-black text-slate-900 outline-none placeholder:text-slate-200"
                    value={title} onChange={(e) => setTitle(e.target.value)} placeholder="配信タイトルを入力してください" required />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <textarea className="md:col-span-2 w-full bg-slate-50 border-none p-10 rounded-[3rem] h-80 text-slate-700 outline-none resize-none leading-relaxed text-lg font-medium"
                      value={content} onChange={(e) => setContent(e.target.value)} placeholder="本文を入力..." required />
                  
                  <div className="space-y-4">
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] h-60 cursor-pointer transition-all ${uploadedFiles.length > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                        {uploading ? <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" /> : 
                        <div className="text-center p-6">
                            <span className="text-5xl mb-4 block">📤</span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">資料を追加添付</p>
                        </div>
                        }
                        <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf,image/*" multiple />
                    </label>

                    {/* 📎 アップロード済みファイルリスト */}
                    <div className="space-y-2">
                        {uploadedFiles.map((file, idx) => (
                            <div key={idx} className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{file.name}</span>
                                <button type="button" onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 px-2 font-black text-xs">✕</button>
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-10 rounded-[3.5rem] font-black text-3xl hover:bg-slate-900 transition-all shadow-2xl disabled:opacity-50 italic">
                {isSubmitting ? '処理中...' : '住民へ一斉配信を実行'}
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
                        <span className="text-lg bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-blue-50">
                          {notice.category === 'urgent' ? '🚨' : '📢'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-black text-slate-800 line-clamp-2">{notice.title}</p>
                          {/* 🕒 履歴にも投函日時を表示 */}
                          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic tracking-widest">Sent: {new Date(notice.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-wider">Read Status</span>
                          <span className="text-xs font-black text-blue-600">{notice.actual_read_count} / {notice.total_residents}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all" style={{ width: `${readRate}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                }) : <p className="text-center text-slate-300 font-bold py-10">履歴なし</p>}
              </div>
            </div>
          </div>
        </div>

        {/* --- 物件登録モーダル --- */}
        {isRegisterModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-[4rem] p-10 shadow-2xl">
              <h3 className="text-3xl font-black italic uppercase mb-8 tracking-tighter">新規物件を <span className="text-blue-600">登録</span></h3>
              <form onSubmit={handleRegisterProperty} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">物件名称</label>
                  <input className="w-full bg-slate-50 p-6 rounded-[2.5rem] font-black text-xl outline-none focus:ring-4 focus:ring-blue-100" placeholder="例：スカイハイツ立川" value={newPropName} onChange={(e) => setNewPropName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex justify-between">
                    <span>所在地（住所）</span>
                  </label>
                  <input className="w-full bg-slate-50 p-6 rounded-[2.5rem] font-black text-xl outline-none focus:ring-4 focus:ring-blue-100" placeholder="東京都立川市羽衣町1-1" value={newPropAddress} onChange={(e) => setNewPropAddress(e.target.value)} required />
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setIsRegisterModalOpen(false)} className="flex-1 py-5 rounded-[2rem] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
                  <button type="submit" disabled={isRegistering} className="flex-1 bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all">
                    {isRegistering ? '座標特定中...' : '登録完了'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- 案内印刷モーダル --- */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowPrintModal(false)}>
            <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-end mb-6 gap-4 no-print">
                <button onClick={() => window.print()} className="bg-blue-600 text-white px-10 py-4 rounded-full font-black shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-3 scale-110">
                   <span>🖨️</span> 印刷を開始
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
                      {displayInviteCode}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-20 text-left">
                  <div className="space-y-8">
                    <h4 className="text-3xl font-black border-l-[12px] border-blue-600 pl-6 mb-10 italic">ご利用の手順</h4>
                    <div className="space-y-10">
                      {[
                        { step: '1', title: 'スキャン', desc: '右記のQRコードをスマホで読み取ります。' },
                        { step: '2', title: '登録', desc: 'メールアドレスと任意のパスワードを入力して登録。' },
                        { step: '3', title: 'コード入力', desc: `招待コード [ ${displayInviteCode} ] を入力。` },
                        { step: '4', title: '完了', desc: '物件掲示板やゴミ出しカレンダーがいつでもスマホで確認可能に！' }
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
                      {selectedProperty && (
                        <img src={getQrCodeUrl()} alt="Property QR Code" className="w-56 h-56 object-contain" />
                      )}
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">Scan to start</p>
                  </div>
                </div>
                <div className="bg-blue-600 rounded-[4rem] p-12 text-white text-center shadow-xl">
                  <h4 className="text-2xl font-black italic tracking-tighter">マンションの暮らしをもっとスマートに。</h4>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}