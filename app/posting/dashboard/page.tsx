'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adSchema } from '../../../lib/validations';
import { uploadImage } from '../../../lib/upload';

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

  const [deliveryMode, setDeliveryMode] = useState<'all' | 'area' | 'specific'>('area');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState<number>(3); 
  const [isSearchingArea, setIsSearchingArea] = useState(false);

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

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(adSchema)
  });

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
          .order('created_at', { ascending: false })
          .limit(3);
        setRecentCampaigns(campaigns || []);

        const { data: adStats } = await supabase.from('local_ad_stats').select('views_count, clicks_count');
        
        if (adStats) {
          const totalViews = adStats.reduce((sum, item) => sum + (item.views_count || 0), 0);
          const totalClicks = adStats.reduce((sum, item) => sum + (item.clicks_count || 0), 0);
          const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00';
          
          setTotalStats({
            impressions: totalViews,
            ctr: ctr
          });
        }
      } catch (err: any) {
        console.error("初期データ取得エラー:", err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 🚨 修正: 画面上のリストに既に同じ名前のファイルがないかチェック
    const duplicateFiles = Array.from(files).filter(newFile => 
      uploadedFiles.some(existingFile => existingFile.name === newFile.name)
    );

    if (duplicateFiles.length > 0) {
      const duplicateNames = duplicateFiles.map(f => f.name).join(', ');
      alert(`【エラー】以下のファイルは既にリストに存在します。\n\n${duplicateNames}\n\n別のファイルを選択するか、リストから削除してください。`);
      e.target.value = ''; // ファイル選択をリセット
      return; // 処理をストップ
    }

    setUploading(true);
    try {
      const newFilesData: {name: string, url: string}[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadImage(file, 'sumikea-images', 'digital-leaflets');
        newFilesData.push({ name: file.name, url: url });
      }

      setUploadedFiles(prev => [...prev, ...newFilesData]);
    } catch (err: any) {
      console.error("アップロード詳細エラー:", err);
      alert(`アップロードに失敗しました。詳細: ${err.message || JSON.stringify(err)}`);
    } finally {
      setUploading(false);
      e.target.value = ''; // 成功時もインプットをリセット
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
      let targetLat: number | null = null;
      let targetLng: number | null = null;

      let result = [];

      if (targetLat && targetLng) {
        result = allProperties.filter(p => {
          if (!p.lat || !p.lng) return false;
          const distance = getDistanceFromLatLonInKm(targetLat, targetLng, p.lat, p.lng);
          return distance <= radius;
        });
      } else {
        result = allProperties.filter(p => p.name?.includes(address) || p.address?.includes(address));
      }
      
      setFilteredProperties(result);
      if (result.length > 0) {
        alert(`指定エリア圏内で ${result.length} 件の物件が見つかりました`);
      } else {
        alert('指定エリア内に配信可能な物件がありませんでした');
      }
    } catch (error) {
      alert('エリア検索に失敗しました');
    } finally {
      setIsSearchingArea(false);
    }
  };

  const onSendAd = async (data: any) => {
    if (uploadedFiles.length === 0) {
      alert('チラシPDFをアップロードしてください');
      return;
    }

    let targetPropertyIds: string[] = [];
    if (deliveryMode === 'specific' && data.property_id) {
      targetPropertyIds = [data.property_id];
    } else if (deliveryMode === 'area') {
      if (filteredProperties.length === 0) {
        alert('エリア内に配信可能な物件がありません。検索をやり直すか、物件を指定してください。');
        return;
      }
      targetPropertyIds = filteredProperties.map(p => p.id);
    } else {
      targetPropertyIds = allProperties.map(p => p.id); 
    }

    setIsSubmitting(true);
    
    const pdfUrlsString = uploadedFiles.map(f => f.url).join(',');

    const inserts = targetPropertyIds.map(pid => ({
      property_id: pid,
      title: data.title,
      content: data.content,
      pdf_url: pdfUrlsString, 
      is_segmented: isSegmentMode,
      target_metadata: demographics,
      starts_at: new Date(startDate).toISOString(),
      expires_at: new Date(endDate).toISOString(),
      status: 'active'
    }));

    const { error } = await supabase.from('digital_flyers').insert(inserts);

    if (!error) {
      alert(`計 ${inserts.length} 件の物件にデジタル投函を開始しました！`);
      reset();
      setUploadedFiles([]);
      setAddress('');
    } else {
      alert('エラー: ' + error.message);
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 font-black text-slate-400 uppercase tracking-widest italic">
      Loading Posting Console...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* ヘッダー統計 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="md:col-span-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Posutto <span className="text-indigo-600">Posting</span></h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">デジタルチラシ投函・運用コンソール</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">総インプレッション数</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{totalStats.impressions.toLocaleString()}</p>
            </div>
            <div className="text-green-500 font-black text-[10px] bg-green-50 px-3 py-1 rounded-full">LIVE</div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">平均クリック率 (CTR)</p>
              <p className="text-3xl font-black tracking-tighter">{totalStats.ctr}%</p>
            </div>
            <div className="absolute -right-4 -bottom-4 text-6xl italic font-black opacity-10">%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 投函作成エディタ */}
          <div className="lg:col-span-7 space-y-8">
            <form onSubmit={handleSubmit(onSendAd)} className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black text-slate-900 mb-10 flex items-center gap-3 italic uppercase tracking-tighter">
                <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
                新規キャンペーン作成
              </h2>

              <div className="space-y-8">
                
                {/* 1. 配信エリア・物件の指定 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">配信エリアの指定</label>
                     <div className="flex bg-slate-100 rounded-full p-1">
                        <button type="button" onClick={() => setDeliveryMode('area')} className={`text-[10px] font-black px-4 py-1.5 rounded-full transition-all ${deliveryMode === 'area' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>圏内指定</button>
                        <button type="button" onClick={() => setDeliveryMode('specific')} className={`text-[10px] font-black px-4 py-1.5 rounded-full transition-all ${deliveryMode === 'specific' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>物件指定</button>
                        <button type="button" onClick={() => { setDeliveryMode('all'); setFilteredProperties(allProperties); }} className={`text-[10px] font-black px-4 py-1.5 rounded-full transition-all ${deliveryMode === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>全物件配信</button>
                     </div>
                  </div>

                  {deliveryMode === 'area' && (
                    <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 space-y-4">
                      <div className="flex gap-4">
                        <input 
                          type="text" 
                          value={address} 
                          onChange={(e) => setAddress(e.target.value)} 
                          placeholder="基準となる住所や店舗名を入力..." 
                          className="flex-1 bg-white p-4 rounded-2xl font-bold text-sm border border-slate-200 outline-none focus:border-indigo-400"
                        />
                        <select 
                          value={radius} 
                          onChange={(e) => setRadius(Number(e.target.value))}
                          className="bg-white p-4 rounded-2xl font-bold text-sm border border-slate-200 outline-none focus:border-indigo-400 w-32"
                        >
                          <option value={1}>半径 1km</option>
                          <option value={3}>半径 3km</option>
                          <option value={5}>半径 5km</option>
                          <option value={10}>半径 10km</option>
                        </select>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleSearchArea}
                        disabled={isSearchingArea || !address}
                        className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl text-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                      >
                        {isSearchingArea ? '検索中...' : 'この圏内にある物件を検索'}
                      </button>
                      
                      <p className="text-[10px] font-bold text-indigo-600 text-right mt-2">
                        現在、対象エリア内に <span className="text-lg font-black">{filteredProperties.length}</span> 件の物件が設定されています。
                      </p>
                    </div>
                  )}

                  {deliveryMode === 'specific' && (
                    <select {...register('property_id')} className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-indigo-500/20">
                      <option value="">配信先（マンション）を選択してください</option>
                      {allProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  
                  {deliveryMode === 'all' && (
                    <div className="bg-slate-50 p-6 rounded-[2rem] text-center border border-slate-100">
                       <p className="text-sm font-black text-slate-600">登録されているすべての物件（{allProperties.length}件）に配信します</p>
                    </div>
                  )}
                </div>

                {/* 期間設定 */}
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">配信スケジュール設定</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 ml-1">配信開始日時</p>
                      <input type="datetime-local" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="w-full bg-white border-none p-5 rounded-2xl font-bold text-sm shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 ml-1">配信終了日時</p>
                      <input type="datetime-local" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="w-full bg-white border-none p-5 rounded-2xl font-bold text-sm shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* PDFアップロード */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">チラシPDFデータ</label>
                    <label className={`w-full h-40 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all ${uploading ? 'opacity-50 pointer-events-none' : 'bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-white'}`}>
                      <span className="text-3xl mb-2">{uploading ? '⏳' : '📄'}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{uploading ? 'アップロード中...' : 'PDFをここにドロップ'}</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf,image/*" multiple />
                    </label>

                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs font-black text-indigo-700 truncate max-w-[180px] hover:underline"
                              title={file.name}
                            >
                              {file.name}
                            </a>
                            <button type="button" onClick={() => removeFile(idx)} className="text-indigo-300 hover:text-red-500 p-1">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* セグメントターゲット */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">ターゲット属性の絞り込み</label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button" 
                        onClick={toggleSelectAllDemographics}
                        className={`p-4 rounded-2xl text-[10px] font-black transition-all border-2 ${Object.values(demographics).every(val => val) ? 'bg-indigo-900 border-indigo-900 text-white shadow-lg' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {Object.values(demographics).every(val => val) ? '全選択を解除' : '全選択する'}
                      </button>

                      {[
                        { key: 'family', label: 'ファミリー層' },
                        { key: 'single', label: '単身者層' },
                        { key: 'senior', label: 'シニア層' }
                      ].map((target) => (
                        <button key={target.key} type="button" onClick={() => setDemographics(d => ({ ...d, [target.key]: !d[target.key as keyof typeof demographics] }))}
                          className={`p-4 rounded-2xl text-[10px] font-black transition-all border-2 ${demographics[target.key as keyof typeof demographics] ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>
                          {target.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 基本情報 */}
                <div className="space-y-4">
                  <input {...register('title')} placeholder="プッシュ通知のタイトル（例：今週のチラシが届きました）" className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  <textarea {...register('content')} placeholder="通知内容の詳細を入力してください..." className="w-full bg-slate-50 p-5 rounded-[2rem] h-32 text-sm border-none resize-none outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>

                <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-xl italic hover:bg-indigo-600 transition-all shadow-2xl active:scale-[0.98] disabled:opacity-50 uppercase tracking-tighter">
                  {isSubmitting ? '処理中...' : 'デジタル投函を実行する'}
                </button>
              </div>
            </form>
          </div>

          {/* 右サイド：モニタリング */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10 flex items-center justify-between">
                ライブ・パフォーマンス
                <span className="flex h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
              </h3>
              
              <div className="space-y-8">
                {recentCampaigns.map((camp, i) => (
                  <div key={i} className="group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-widest">配信中</span>
                        <h4 className="text-md font-black text-slate-800 mt-2 italic">{camp.title}</h4>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-slate-900 leading-none">{(camp.views_count || 0).toLocaleString()}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">開封数</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]" style={{ width: camp.views_count ? '100%' : '0%' }}></div>
                    </div>
                  </div>
                ))}
                {recentCampaigns.length === 0 && (
                  <p className="text-[10px] text-slate-300 font-bold text-center py-10 uppercase tracking-widest">現在稼働中のキャンペーンはありません</p>
                )}
              </div>
            </div>

            {/* 分析レポート誘導 */}
            <div className="bg-indigo-600 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-3xl font-black italic tracking-tighter mb-4">詳細な分析データ</h3>
                <p className="text-xs font-bold leading-relaxed opacity-70 mb-8 max-w-[240px]">
                  ターゲット属性別の開封率や、PDF閲覧ヒートマップを詳細に分析し、次回の配布計画を最適化できます。
                </p>
                <button 
                  onClick={() => router.push('/posting/reports')}
                  className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-50 transition-all active:scale-95 shadow-xl shadow-indigo-900/20 tracking-widest"
                >
                  詳細レポートを表示 →
                </button>
              </div>
              <div className="absolute -right-10 -bottom-10 text-[12rem] font-black italic opacity-5 select-none uppercase tracking-tighter group-hover:scale-110 transition-transform duration-700">データ</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}