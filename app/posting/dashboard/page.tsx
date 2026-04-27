'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { uploadImage } from '../../../lib/upload';

// 距離計算ロジック
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function PostingDigitalDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  
  // 🎯 追加: 運営会社からの連絡用ステート
  const [systemNotices, setSystemNotices] = useState<any[]>([]);

  const [deliveryMode, setDeliveryMode] = useState<'all' | 'area' | 'specific'>('area');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState<number>(3); 
  const [isSearchingArea, setIsSearchingArea] = useState(false);

  // フォーム用ステート
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetPropertyId, setTargetPropertyId] = useState('');

  const [totalStats, setTotalStats] = useState({
    impressions: 0,
    ctr: '0.00'
  });

  const [uploadedFiles, setUploadedFiles] = useState<{name: string, url: string}[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [demographics, setDemographics] = useState({
    family: false, single: false, senior: false
  });

  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));

  const isSegmentMode = Object.values(demographics).some(val => val === true);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login?type=posting'); return; }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        const role = profile?.role?.toUpperCase() || 'USER';
        
        if (role !== 'ADMIN' && role !== 'POSTING') { 
          router.push('/login?type=posting'); 
          return; 
        }

        const { data: props } = await supabase.from('properties').select('id, name, address, lat, lng');
        setAllProperties(props || []);
        setFilteredProperties(props || []);

        const { data: campaigns } = await supabase
          .from('digital_flyers')
          .select('*')
          .order('created_at', { ascending: false });
          
        setRecentCampaigns(campaigns?.slice(0, 3) || []);

        // 実際のデータから集計
        if (campaigns) {
          const totalViews = campaigns.reduce((sum, item) => sum + (item.views_count || 0), 0);
          const totalClicks = campaigns.reduce((sum, item) => sum + (item.clicks_count || 0), 0);
          const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00';
          
          setTotalStats({
            impressions: totalViews,
            ctr: ctr
          });
        }

        // 🎯 追加: 運営会社からのお知らせを取得（テーブル名は環境に合わせて修正してください）
        const { data: notices } = await supabase
          .from('system_notices')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (notices) setSystemNotices(notices);

      } catch (err: any) {
        console.error("初期データ取得エラー:", err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [router]);

  const getCoords = async (rawAddress: string) => {
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
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
          headers: { 'User-Agent': 'PosuttoPosting/1.3' }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        await new Promise(r => setTimeout(r, 200));
      } catch (e) { console.error(e); }
    }
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newFilesData: { name: string; url: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i], 'sumikea-images', 'digital-leaflets');
        newFilesData.push({ name: files[i].name, url: url });
      }
      setUploadedFiles(prev => [...prev, ...newFilesData]);
    } catch (err: any) {
      alert(`アップロード失敗`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSelectAllDemographics = () => {
    const allSelected = Object.values(demographics).every(val => val);
    setDemographics({
      family: !allSelected,
      single: !allSelected,
      senior: !allSelected
    });
  };

  const handleSearchArea = async () => {
    if (!address) return;
    setIsSearchingArea(true);
    try {
      const targetCoords = await getCoords(address);
      let result = [];
      if (targetCoords) {
        result = allProperties.filter(p => {
          if (!p.lat || !p.lng) return false;
          return getDistanceFromLatLonInKm(targetCoords.lat, targetCoords.lng, p.lat, p.lng) <= radius;
        });
      } else {
        result = allProperties.filter(p => p.name?.includes(address) || p.address?.includes(address));
      }
      setFilteredProperties(result);
      alert(result.length > 0 ? `${result.length}件の物件がヒットしました` : '配信可能物件なし');
    } catch (error) {
      alert('エリア検索失敗');
    } finally {
      setIsSearchingArea(false);
    }
  };

  const onSendAdManual = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title) return alert('タイトルを入力してください');
    if (!content) return alert('配信内容を入力してください');
    if (uploadedFiles.length === 0) return alert('チラシPDFをアップロードしてください');
    
    let targetPropertyIds: string[] = [];
    if (deliveryMode === 'specific') {
        if (!targetPropertyId) return alert('配信先物件を選択してください');
        targetPropertyIds = [targetPropertyId];
    } else if (deliveryMode === 'area') {
        if (filteredProperties.length === 0) return alert('対象物件が0件です。エリア検索を行ってください。');
        targetPropertyIds = filteredProperties.map(p => p.id);
    } else {
        targetPropertyIds = allProperties.map(p => p.id); 
    }

    if (!confirm(`計 ${targetPropertyIds.length} 件に投函を開始します。`)) return;

    setIsSubmitting(true);
    try {
      const pdfUrlsString = uploadedFiles.map(f => f.url).join(',');
      const inserts = targetPropertyIds.map(pid => ({
        property_id: pid,
        title: title,
        content: content,
        pdf_url: pdfUrlsString, 
        is_segmented: isSegmentMode,
        target_metadata: demographics,
        starts_at: new Date(startDate).toISOString(),
        expires_at: new Date(endDate).toISOString(),
        status: 'active'
      }));

      const { error } = await supabase.from('digital_flyers').insert(inserts);
      if (error) throw error;

      alert(`投函完了しました！`);
      setTitle(''); setContent(''); setUploadedFiles([]); setAddress('');
      
      const { data: campaigns } = await supabase.from('digital_flyers').select('*').order('created_at', { ascending: false }).limit(3);
      setRecentCampaigns(campaigns || []);
    } catch (err: any) {
      alert('送信エラー: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen font-black text-slate-400 uppercase tracking-widest italic">
      Loading...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        <header className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="md:col-span-2 flex flex-col justify-center">
            <h1 className="text-4xl font-black italic uppercase">Posutto <span className="text-indigo-600">Posting</span></h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">デジタルチラシ投函コンソール</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">総インプレッション</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{totalStats.impressions.toLocaleString()}</p>
            </div>
            {/* 全体ダッシュボード稼働中を示すインジケーター（UIとして） */}
            <div className="text-green-500 font-black text-[10px] bg-green-50 px-3 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> SYSTEM OK
            </div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white flex justify-between items-center relative overflow-hidden">
            <div className="absolute right-[-10%] top-[-10%] opacity-10 text-7xl">📈</div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-500 uppercase">平均クリック率</p>
              <p className="text-3xl font-black tracking-tighter">{totalStats.ctr}%</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
            <form onSubmit={onSendAdManual} className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black text-slate-900 mb-10 flex items-center gap-3 italic uppercase tracking-tighter">
                <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
                新規キャンペーン作成
              </h2>

              <div className="space-y-8">
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">配信エリアの指定</label>
                     <div className="flex bg-slate-100 rounded-full p-1">
                        {['area', 'specific', 'all'].map((mode) => (
                          <button key={mode} type="button" onClick={() => setDeliveryMode(mode as any)} 
                            className={`text-[10px] font-black px-4 py-1.5 rounded-full transition-all ${deliveryMode === mode ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>
                            {mode === 'area' ? '圏内指定' : mode === 'specific' ? '物件指定' : '全物件配信'}
                          </button>
                        ))}
                     </div>
                  </div>

                  {deliveryMode === 'area' && (
                    <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 space-y-4">
                      <div className="flex gap-4">
                        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="基準住所を入力..." className="flex-1 bg-white p-4 rounded-2xl font-bold text-sm outline-none" />
                        <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="bg-white p-4 rounded-2xl font-bold text-sm outline-none w-32">
                          <option value={1}>半径 1km</option>
                          <option value={3}>半径 3km</option>
                          <option value={5}>半径 5km</option>
                        </select>
                      </div>
                      <button type="button" onClick={handleSearchArea} disabled={isSearchingArea} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl text-sm shadow-lg">圏内物件を検索</button>
                    </div>
                  )}

                  {deliveryMode === 'specific' && (
                    <select value={targetPropertyId} onChange={(e) => setTargetPropertyId(e.target.value)} className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-sm outline-none">
                      <option value="">配信先を選択してください</option>
                      {allProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">チラシPDFデータ</label>
                    <label className="w-full h-40 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all">
                      <span className="text-3xl mb-2">{uploading ? '⏳' : '📄'}</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf,image/*" multiple />
                    </label>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-[10px] font-black text-indigo-700">
                          <span className="truncate max-w-[200px]">{file.name}</span>
                          <button type="button" onClick={() => removeFile(idx)} className="text-indigo-300 hover:text-red-500">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">属性絞り込み</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={toggleSelectAllDemographics} className={`p-4 rounded-2xl text-[10px] font-black transition-all border-2 ${Object.values(demographics).every(val => val) ? 'bg-indigo-900 border-indigo-900 text-white shadow-lg' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'}`}>全選択</button>
                      {['family', 'single', 'senior'].map((key) => (
                        <button key={key} type="button" onClick={() => setDemographics(d => ({ ...d, [key]: !d[key as keyof typeof demographics] }))}
                          className={`p-4 rounded-2xl text-[10px] font-black border-2 transition-all ${demographics[key as keyof typeof demographics] ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>
                          {key === 'family' ? 'ファミリー' : key === 'single' ? '単身者' : 'シニア'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="通知タイトル" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-sm outline-none" />
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="通知内容..." className="w-full bg-slate-50 p-5 rounded-[2rem] h-32 text-sm outline-none resize-none" />
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-xl italic hover:bg-indigo-600 transition-all shadow-2xl active:scale-[0.98]">
                  {isSubmitting ? '処理中...' : 'デジタル投函を実行する'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-8">
            
            {/* 🎯 追加: 運営会社からの連絡セクション */}
            <div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-6xl">🏢</div>
              <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-8 flex items-center gap-3 relative z-10">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                運営会社からの連絡
              </h3>
              
              <div className="space-y-6 relative z-10">
                {systemNotices.length > 0 ? (
                  systemNotices.map((notice, i) => (
                    <div key={i} className="border-b border-white/10 pb-5 last:border-0 last:pb-0 group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">
                          {new Date(notice.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">{notice.title}</h4>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-2">{notice.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">現在、新しいお知らせはありません</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase mb-10">最近のキャンペーン</h3>
              <div className="space-y-8">
                {recentCampaigns.length > 0 ? (
                  recentCampaigns.map((camp, i) => {
                    const isActive = camp.status === 'active';
                    
                    return (
                      <div key={i} className="group border-b border-slate-50 pb-6 last:border-0 last:pb-0 cursor-pointer" onClick={() => router.push('/posting/report')}>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                              {isActive ? 'LIVE' : 'ENDED'}
                            </span>
                            <h4 className="text-md font-black text-slate-800 mt-2 italic line-clamp-1 group-hover:text-indigo-600 transition-colors">{camp.title}</h4>
                          </div>
                          <div className="text-right pl-4">
                            <p className="text-xl font-black text-slate-900">{(camp.views_count || 0).toLocaleString()}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Views</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center py-6">キャンペーンがありません</p>
                )}
              </div>

              {/* レポート出力画面へのボタン */}
              <button 
                onClick={() => router.push('/posting/report')}
                className="w-full mt-10 py-6 bg-indigo-600 text-white rounded-[2rem] text-sm font-black shadow-xl shadow-indigo-200 hover:bg-slate-900 hover:shadow-slate-200 transition-all uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] group"
              >
                <span className="text-xl opacity-80 group-hover:opacity-100 transition-opacity">📊</span>
                詳細なレポートを確認・出力 →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}