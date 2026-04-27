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
  
  // 🎯 配信ターゲット切り替え用（'property' = 物件住民, 'system' = 運営からの全体連絡）
  const [deliveryTarget, setDeliveryTarget] = useState<'property' | 'system'>('property');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('campaign');
  const [status, setStatus] = useState<'published' | 'draft' | 'scheduled'>('published');
  
  const [scheduledAt, setScheduledAt] = useState(
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  
  const [isPermanent, setIsPermanent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, url: string}[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // --- 🌐 座標取得ロジック ---
  const getCoordinates = async (rawAddress: string) => {
    const normalized = rawAddress
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .replace(/[－ー－―ー−-]/g, '-')
      .replace(/[　]/g, ' ')
      .trim();

    const base = normalized.split(' ')[0];
    const searchPatterns = [normalized, base, base.replace(/-\d+$/, ''), base.replace(/\d+.*$/, '')];
    const uniquePatterns = Array.from(new Set(searchPatterns)).filter(p => p.length > 3);

    for (const query of uniquePatterns) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
          { headers: { 'User-Agent': 'PosuttoManager/1.3' } }
        );
        const data = await response.json();
        if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        await new Promise(r => setTimeout(r, 200));
      } catch (err) { console.error('Geocoder Error:', err); }
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
      } catch (err) { console.error('データ取得エラー:', err); } finally { setLoading(false); }
    };
    fetchAuthAndData();
  }, [router]);

  const refreshPropertyList = async (userId: string, role: string, targetNewId?: string) => {
    let propertyList: any[] = [];
    if (role === 'ADMIN') {
      const { data: allProps } = await supabase.from('properties').select('id, name, invite_code');
      if (allProps) {
        propertyList = allProps.map(p => ({ property_id: p.id, properties: p }));
      }
    } else {
      const { data: managerProps } = await supabase
        .from('property_managers')
        .select('property_id, properties!inner(id, name, invite_code)')
        .eq('user_id', userId);
      if (managerProps) {
        propertyList = managerProps.map((mp: any) => ({
          property_id: mp.properties.id,
          properties: mp.properties
        }));
      }
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
    if (!propId || propId === 'undefined') return;
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
    } catch (err) { console.error('履歴取得エラー:', err); }
  };

  const handleRegisterProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName || !newPropAddress || isRegistering) return;
    setIsRegistering(true);

    try {
      const coords = await getCoordinates(newPropAddress);
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data: newProp, error: propError } = await supabase
        .from('properties')
        .insert([{ name: newPropName, address: newPropAddress, invite_code: inviteCode, lat: coords.lat, lng: coords.lng }])
        .select().single();

      if (propError) throw propError;

      await supabase.from('property_managers').insert([{ property_id: newProp.id, user_id: currentUserId }]);

      alert(`「${newPropName}」を登録しました。`);
      setNewPropName(''); setNewPropAddress(''); setIsRegisterModalOpen(false);
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUserId).single();
      await refreshPropertyList(currentUserId, profile?.role || 'MANAGER', newProp.id);

    } catch (err: any) { alert('物件登録エラー: ' + err.message); } finally { setIsRegistering(false); }
  };

  const handlePropertyChange = (propId: string) => {
    if (!propId || propId === 'undefined') return;
    setSelectedProperty(propId);
    const found = managedProperties.find(p => p.property_id === propId);
    if (found) {
      setSelectedPropertyData(found.properties);
      fetchNoticeHistory(propId);
    }
  };

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
    } catch (err: any) { alert(`アップロード失敗: ${err.message}`); } finally { setUploading(false); e.target.value = ''; }
  };

  const removeFile = (index: number) => setUploadedFiles(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetPropId = selectedPropertyData?.id || selectedProperty;
    if (deliveryTarget === 'property' && (!targetPropId || targetPropId.length < 10)) {
        return alert('エラー: 物件が選択されていません。');
    }

    setIsSubmitting(true);
    
    try {
        const finalTitle = category === 'urgent' && !title.includes('【重要】') ? `【重要】${title}` : title;
        const combinedPdfUrls = uploadedFiles.map(f => f.url).join(',');

        // 🎯 保存先テーブルの分岐
        const tableName = deliveryTarget === 'system' ? 'system_notices' : 'property_notifications';

        const payload: any = {
          title: finalTitle,
          content,
          category,
          pdf_url: combinedPdfUrls,
          status: status,
          is_permanent: isPermanent,
          expires_at: isPermanent ? null : new Date(expiresAt).toISOString(),
        };

        // 物件配信の場合のみプロパティ追加
        if (deliveryTarget === 'property') {
          payload.property_id = targetPropId;
          payload.target_audience = ['resident'];
        }

        if (status === 'scheduled') {
          payload.published_at = new Date(scheduledAt).toISOString();
        } else if (status === 'published') {
          payload.published_at = new Date().toISOString();
        }

        const { error } = await supabase.from(tableName).insert(payload);
        if (error) throw error;

        alert(deliveryTarget === 'system' ? '全ユーザーへ「運営連絡」を配信しました！' : '住民へ一斉配信しました！');
        setTitle(''); setContent(''); setUploadedFiles([]); 
        if (deliveryTarget === 'property') fetchNoticeHistory(targetPropId);
    } catch (err: any) {
        alert('配信エラー: ' + err.message);
    } finally { setIsSubmitting(false); }
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
        @media print { body * { visibility: hidden; } #print-area, #print-area * { visibility: visible; } #print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; } .no-print { display: none !important; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase italic">Now Editing</span>
                <h1 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter italic uppercase truncate">
                  {deliveryTarget === 'system' ? 'Posutto System Official' : (selectedPropertyData?.name || '---')}
                </h1>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <p className="text-slate-400 font-bold text-xl flex items-center gap-2">
                  <span className="text-2xl">🏢</span> {deliveryTarget === 'system' ? '運営会社インフォメーション' : '住民お知らせコンソール'}
                </p>
                <button onClick={() => setIsRegisterModalOpen(true)} className="bg-slate-900 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-lg">
                  + 物件を追加登録
                </button>
              </div>
            </div>
            
            <div className={`bg-white p-6 rounded-[2.5rem] shadow-xl border-2 flex items-center gap-6 min-w-[360px] transition-all ${deliveryTarget === 'system' ? 'opacity-30 pointer-events-none' : 'border-blue-50'}`}>
              <div className="flex-1">
                <label className="text-[10px] font-black text-blue-600 uppercase block mb-2">操作物件切替</label>
                <select className="w-full bg-slate-50 p-4 rounded-2xl font-black text-slate-700 outline-none cursor-pointer text-lg appearance-none"
                    value={selectedProperty} onChange={(e) => handlePropertyChange(e.target.value)}>
                  {managedProperties.map((p, i) => (
                    <option key={p.property_id || i} value={p.property_id}>{p.properties?.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-14 h-14 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-2xl shadow-lg">🔄</div>
            </div>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1">
            <form onSubmit={handleSubmit} className={`bg-white rounded-[4rem] p-8 md:p-14 shadow-2xl border-2 space-y-12 transition-all ${deliveryTarget === 'system' ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-50'}`}>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-8 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">配信ターゲット</label>
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button type="button" onClick={() => setDeliveryTarget('property')}
                      className={`px-8 py-3 rounded-xl text-[11px] font-black transition-all ${deliveryTarget === 'property' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
                      🏢 住民のみ
                    </button>
                    <button type="button" onClick={() => setDeliveryTarget('system')}
                      className={`px-8 py-3 rounded-xl text-[11px] font-black transition-all ${deliveryTarget === 'system' ? 'bg-indigo-600 shadow-md text-white' : 'text-slate-400'}`}>
                      🌐 運営連絡(全体)
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic">配信モード</label>
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    {['published', 'scheduled', 'draft'].map((s) => (
                      <button key={s} type="button" onClick={() => setStatus(s as any)}
                        className={`px-8 py-3 rounded-xl text-[11px] font-black transition-all ${status === s ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
                        {s === 'published' ? '即時' : s === 'scheduled' ? '予約' : '下書き'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {status === 'scheduled' && (
                <div className="bg-blue-50 p-6 rounded-[2.5rem] border-2 border-blue-100 flex items-center gap-6">
                  <span className="text-4xl">⏳</span>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block">配信予定日時</label>
                    <input type="datetime-local" className="w-full bg-white p-4 rounded-xl font-bold text-lg outline-none"
                        value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">カテゴリー</label>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase italic ml-1">掲載期間設定</label>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-4 border border-slate-100">
                    <button type="button" onClick={() => setIsPermanent(!isPermanent)}
                      className={`w-full py-4 rounded-2xl text-[10px] font-black transition-all ${isPermanent ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                      {isPermanent ? '✅ 常にトップに固定' : '掲載終了日時を指定する'}
                    </button>
                    {!isPermanent && (
                      <input type="datetime-local" className="w-full p-4 rounded-xl font-bold text-sm outline-none" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                <input className="w-full bg-slate-50 border-none p-8 rounded-[2.5rem] text-2xl font-black outline-none focus:ring-4 focus:ring-blue-100"
                    value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトルを入力" required />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <textarea className="md:col-span-2 w-full bg-slate-50 border-none p-10 rounded-[3rem] h-80 outline-none leading-relaxed text-lg font-medium focus:ring-4 focus:ring-blue-100"
                      value={content} onChange={(e) => setContent(e.target.value)} placeholder="本文を入力..." required />
                  <div className="space-y-4">
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] h-60 cursor-pointer transition-all ${uploadedFiles.length > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                        {uploading ? <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" /> : 
                        <div className="text-center p-6"><span className="text-5xl mb-4 block">📤</span><p className="text-[10px] font-black uppercase text-slate-500">資料添付</p></div>}
                        <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf,image/*" multiple />
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                        {uploadedFiles.map((file, idx) => (
                            <div key={idx} className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[120px]">{file.name}</span>
                                <button type="button" onClick={() => removeFile(idx)} className="text-red-400 px-2 font-black text-xs">✕</button>
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} 
                  className={`w-full py-10 rounded-[3.5rem] font-black text-3xl transition-all shadow-2xl italic uppercase ${deliveryTarget === 'system' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-blue-600 hover:bg-slate-900 text-white'}`}>
                {isSubmitting ? 'SENDING...' : deliveryTarget === 'system' ? '📢 運営連絡として全体配信' : '住民へ一斉配信を実行'}
              </button>
            </form>
          </div>

          <div className="w-full xl:w-96">
            <div className={`bg-white rounded-[4rem] p-10 shadow-sm border border-slate-100 sticky top-10 transition-all ${deliveryTarget === 'system' ? 'opacity-30 blur-[2px]' : ''}`}>
              <h3 className="text-[11px] font-black uppercase text-slate-400 italic mb-10">配信履歴</h3>
              <div className="space-y-12">
                {recentNotices.length > 0 ? recentNotices.map((notice) => (
                  <div key={notice.id} className="group border-b border-slate-50 pb-8 last:border-0">
                    <div className="flex gap-4 items-start mb-6">
                      <span className="text-lg bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-blue-50">
                        {notice.category === 'urgent' ? '🚨' : '📢'}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800 line-clamp-2">{notice.title}</p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic">{new Date(notice.published_at || notice.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )) : <p className="text-center text-slate-300 font-bold py-10">履歴なし</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}