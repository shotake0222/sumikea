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
  const [pdfUrl, setPdfUrl] = useState('');
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

        const role = user?.user_metadata?.role?.toUpperCase() || 'USER';
        if (role !== 'ADMIN' && role !== 'POSTING') { router.push('/login?type=posting'); return; }

        // 物件リスト取得
        const { data: props } = await supabase.from('properties').select('id, name');
        setTargetProperties(props || []);

        // 直近の配信履歴（簡易アナリティクス用）の取得
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'digital-leaflets');
      setPdfUrl(url);
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSendAd = async (data: any) => {
    setIsSubmitting(true);
    const { error } = await supabase.from('digital_flyers').insert({
      property_id: data.property_id,
      title: data.title,
      content: data.content,
      pdf_url: pdfUrl,
      is_segmented: isSegmentMode,
      target_metadata: demographics,
      starts_at: new Date(startDate).toISOString(),
      expires_at: new Date(endDate).toISOString(),
      status: 'active'
    });

    if (!error) {
      alert('デジタルポスティング・キャンペーンを開始しました');
      reset();
      setPdfUrl('');
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse">LOADING ANALYTICS...</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-10">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER: アナリティクス・サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="md:col-span-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">POSTING ANALYTICS</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">ポスティング業者専用：高度配信管理コンソール</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Total Reach</p>
              <p className="text-2xl font-black text-slate-900">42,802</p>
            </div>
            <div className="text-green-500 font-bold text-xs">↑ 12.5%</div>
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
          
          {/* 左側：メイン配信エディタ */}
          <div className="lg:col-span-7 space-y-8">
            <form onSubmit={handleSubmit(onSendAd)} className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200">
              <h2 className="text-lg font-black text-slate-800 mb-10 flex items-center gap-3">
                <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm italic">!</span>
                新規キャンペーン作成
              </h2>

              <div className="space-y-8">
                {/* 1. 期間管理（厳重設定） */}
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Campaign Duration (厳重配信期間)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 ml-1">START</p>
                      <input type="datetime-local" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="w-full bg-white border-none p-4 rounded-2xl font-bold text-sm shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 ml-1">END</p>
                      <input type="datetime-local" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="w-full bg-white border-none p-4 rounded-2xl font-bold text-sm shadow-inner" />
                    </div>
                  </div>
                </div>

                {/* 2. ファイル & ターゲット */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Flyer (PDF)</label>
                    <label className={`w-full h-40 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition ${pdfUrl ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-2xl mb-2">{pdfUrl ? '✅' : '📤'}</span>
                      <span className="text-[10px] font-black text-slate-400">{pdfUrl ? 'UPLOADED' : 'SELECT PDF'}</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf" />
                    </label>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Filters</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(demographics).map((key) => (
                        <button key={key} type="button" onClick={() => setDemographics(d => ({ ...d, [key]: !d[key as keyof typeof demographics] }))}
                          className={`p-3 rounded-xl text-[10px] font-black transition-all border-2 ${demographics[key as keyof typeof demographics] ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                          {key.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. 本文 */}
                <div className="space-y-4">
                  <select {...register('property_id')} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border-none">
                    <option value="">配信先物件を選択</option>
                    {targetProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input {...register('title')} placeholder="プッシュ通知タイトル" className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm border-none" />
                  <textarea {...register('content')} placeholder="配信内容詳細..." className="w-full bg-slate-50 p-4 rounded-3xl h-32 text-sm border-none resize-none" />
                </div>

                <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-lg hover:bg-indigo-600 transition-all shadow-2xl">
                  {isSubmitting ? 'PROCESSING...' : 'CONFIRM & LAUNCH CAMPAIGN'}
                </button>
              </div>
            </form>
          </div>

          {/* 右側：ライブ配信モニタリング */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-200">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center justify-between">
                Live Status
                <span className="flex h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
              </h3>
              
              <div className="space-y-6">
                {recentCampaigns.map((camp, i) => (
                  <div key={i} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[8px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase">Active Now</span>
                        <h4 className="text-sm font-black text-slate-800 mt-1">{camp.title}</h4>
                      </div>
                      <p className="text-lg font-black text-slate-900">1,240 <span className="text-[10px] text-slate-400">Views</span></p>
                    </div>
                    
                    {/* 配信ゲージ */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mb-3">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    
                    <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                      <span>Start: {new Date(camp.starts_at).toLocaleDateString()}</span>
                      <span className="text-red-400 italic">Expires: {new Date(camp.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 高度な分析リンク */}
            <div className="bg-indigo-700 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-black italic tracking-tighter mb-4 text-indigo-200">Deep Analytics</h3>
                <p className="text-xs font-bold leading-relaxed opacity-80 mb-6">
                  住民の属性別開封率、PDFの平均閲覧時間、クリックされた時間帯のヒートマップを確認できます。
                </p>
                <button className="bg-white text-indigo-700 px-8 py-3 rounded-full font-black text-[10px] uppercase hover:bg-indigo-50 transition">
                  View Full Report →
                </button>
              </div>
              <div className="absolute -right-10 -bottom-10 text-[10rem] font-black italic opacity-10">CHART</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}