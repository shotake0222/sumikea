'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adSchema } from '../../../lib/validations';
import { uploadImage } from '../../../lib/upload';

export default function PostingDigitalDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [targetProperties, setTargetProperties] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);

  // --- 状態管理：配信設定 ---
  // 複数PDF対応のため配列に変更
  const [pdfUrls, setPdfUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [demographics, setDemographics] = useState({
    family: false, single: false, senior: false, highIncome: false
  });

  // 配信期間設定
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));

  const isSegmentMode = Object.values(demographics).some(val => val === true);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
    resolver: zodResolver(adSchema)
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login?type=posting'); return; }

        // ロールチェック（ADMINまたはPOSTING）
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const role = profile?.role?.toUpperCase() || 'USER';
        
        if (role !== 'ADMIN' && role !== 'POSTING') { 
          router.push('/login?type=posting'); 
          return; 
        }

        // 物件リスト取得
        const { data: props } = await supabase.from('properties').select('id, name');
        setTargetProperties(props || []);

        // 直近の配信履歴取得
        const { data: campaigns } = await supabase
          .from('digital_flyers')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);
        setRecentCampaigns(campaigns || []);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [router]);

  // --- 複数ファイルアップロード処理 ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadImage(file, 'digital-leaflets'));
      const newUrls = await Promise.all(uploadPromises);
      setPdfUrls(prev => [...prev, ...newUrls]);
    } catch (err) {
      alert('一部のファイルアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // ファイル削除機能
  const removeFile = (index: number) => {
    setPdfUrls(prev => prev.filter((_, i) => i !== index));
  };

  const onSendAd = async (data: any) => {
    if (pdfUrls.length === 0) {
      alert('PDFを少なくとも1つアップロードしてください');
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await supabase.from('digital_flyers').insert({
      property_id: data.property_id,
      title: data.title,
      content: data.content,
      // 複数URLをカンマ区切り、またはJSONBとして保存（スキーマに合わせて調整）
      pdf_url: pdfUrls.join(','), 
      is_segmented: isSegmentMode,
      target_metadata: demographics,
      starts_at: new Date(startDate).toISOString(),
      expires_at: new Date(endDate).toISOString(),
      status: 'active'
    });

    if (!error) {
      alert('新規投函を開始しました');
      reset();
      setPdfUrls([]);
    } else {
      alert('エラーが発生しました: ' + error.message);
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Loading Analytics...</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-10 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER: アナリティクス・サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="md:col-span-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">POSTING ANALYTICS</h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">高度配信管理コンソール</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Total Reach</p>
              <p className="text-2xl font-black text-slate-900">42,802</p>
            </div>
            <div className="text-green-500 font-bold text-xs bg-green-50 px-3 py-1 rounded-full">↑ 12.5%</div>
          </div>
          <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase">Avg CTR</p>
              <p className="text-2xl font-black">8.42%</p>
            </div>
            <div className="text-indigo-400 font-bold text-xs italic">High-Perf</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 左側：メイン投函エディタ */}
          <div className="lg:col-span-7 space-y-8">
            <form onSubmit={handleSubmit(onSendAd)} className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200">
              <h2 className="text-lg font-black text-slate-800 mb-10 flex items-center gap-3">
                <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm italic shadow-lg shadow-indigo-200">!</span>
                新規投函作成
              </h2>

              <div className="space-y-8">
                {/* 1. 期間管理 */}
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Posting Duration (配信期間設定)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 ml-1 uppercase">Start</p>
                      <input type="datetime-local" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="w-full bg-white border-none p-4 rounded-2xl font-bold text-sm shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 ml-1 uppercase">End</p>
                      <input type="datetime-local" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="w-full bg-white border-none p-4 rounded-2xl font-bold text-sm shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                  </div>
                </div>

                {/* 2. 複数ファイル & ターゲット */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Flyers (複数選択可)</label>
                    <label className={`w-full h-32 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${uploading ? 'opacity-50 pointer-events-none' : 'bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-white'}`}>
                      <span className="text-2xl mb-1">{uploading ? '⏳' : '📤'}</span>
                      <span className="text-[10px] font-black text-slate-400">{uploading ? 'UPLOADING...' : 'SELECT PDF FILES'}</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf" multiple />
                    </label>

                    {/* アップロード済みリスト（UI改善：膨大な量に対応） */}
                    {pdfUrls.length > 0 && (
                      <div className="mt-4 max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {pdfUrls.map((url, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-indigo-50 p-3 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="text-xs">📄</span>
                              <span className="text-[10px] font-bold text-indigo-700 truncate">Flyer_{idx + 1}.pdf</span>
                            </div>
                            <button type="button" onClick={() => removeFile(idx)} className="text-indigo-300 hover:text-red-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Filters</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(demographics).map((key) => (
                        <button key={key} type="button" onClick={() => setDemographics(d => ({ ...d, [key]: !d[key as keyof typeof demographics] }))}
                          className={`p-3 rounded-xl text-[10px] font-black transition-all border-2 ${demographics[key as keyof typeof demographics] ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                          {key.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. 本文 */}
                <div className="space-y-4">
                  <select {...register('property_id')} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="">配信先物件を選択</option>
                    {targetProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input {...register('title')} placeholder="プッシュ通知タイトル（例：最新チラシ公開！）" className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  <textarea {...register('content')} placeholder="配信内容の詳細を入力してください..." className="w-full bg-slate-50 p-4 rounded-3xl h-32 text-sm border-none resize-none outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>

                <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-lg hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-300 disabled:opacity-50 active:scale-[0.98]">
                  {isSubmitting ? 'PROCESSING...' : '新規投函を開始する'}
                </button>
              </div>
            </form>
          </div>

          {/* 右側：ライブ配信モニタリング */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-200">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center justify-between">
                Live Status
                <span className="flex h-2 w-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
              </h3>
              
              <div className="space-y-6">
                {recentCampaigns.length > 0 ? recentCampaigns.map((camp, i) => (
                  <div key={i} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 relative overflow-hidden group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[8px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase">Active</span>
                        <h4 className="text-sm font-black text-slate-800 mt-1 truncate max-w-[150px]">{camp.title}</h4>
                      </div>
                      <p className="text-lg font-black text-slate-900">1,240 <span className="text-[10px] text-slate-400 italic">Views</span></p>
                    </div>
                    
                    {/* 配信ゲージ（ダミー） */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mb-3">
                      <div className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: '65%' }}></div>
                    </div>
                    
                    <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                      <span>Start: {new Date(camp.starts_at).toLocaleDateString()}</span>
                      <span className="text-red-400 italic">Expires: {new Date(camp.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-slate-300 font-bold text-xs py-10">配信履歴がありません</p>
                )}
              </div>
            </div>

            {/* 高度な分析リンク（修正：遷移先を設置） */}
            <div className="bg-indigo-700 rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-300 relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-2xl font-black italic tracking-tighter mb-4 text-indigo-200">Deep Analytics</h3>
                <p className="text-xs font-bold leading-relaxed opacity-80 mb-6">
                  住民の属性別開封率、PDFの平均閲覧時間、クリックされた時間帯のヒートマップを確認できます。
                </p>
                <button 
                  onClick={() => router.push('/posting/reports')}
                  className="bg-white text-indigo-700 px-8 py-3 rounded-full font-black text-[10px] uppercase hover:bg-indigo-50 transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
                >
                  View Full Report →
                </button>
              </div>
              <div className="absolute -right-10 -bottom-10 text-[10rem] font-black italic opacity-10 group-hover:scale-110 transition-transform duration-700">CHART</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}