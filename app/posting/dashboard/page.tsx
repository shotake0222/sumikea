'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase'; // 階層に注意
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

  // ✅ 動的統計データ用のステート
  const [totalStats, setTotalStats] = useState({
    impressions: 0,
    ctr: '0.00'
  });

  // 状態管理
  const [pdfUrls, setPdfUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [demographics, setDemographics] = useState({
    family: false, single: false, senior: false, highIncome: false
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

        // 1. 物件リスト取得
        const { data: props } = await supabase.from('properties').select('id, name');
        setTargetProperties(props || []);

        // 2. 最近のキャンペーン取得
        const { data: campaigns } = await supabase
          .from('digital_flyers')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);
        setRecentCampaigns(campaigns || []);

        // ✅ 3. インプレッション数とCTRのリアルタイム集計
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

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadImage(file, 'digital-leaflets'));
      const newUrls = await Promise.all(uploadPromises);
      setPdfUrls(prev => [...prev, ...newUrls]);
    } catch (err) {
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setPdfUrls(prev => prev.filter((_, i) => i !== index));
  };

  const onSendAd = async (data: any) => {
    if (pdfUrls.length === 0) {
      alert('チラシPDFをアップロードしてください');
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from('digital_flyers').insert({
      property_id: data.property_id,
      title: data.title,
      content: data.content,
      pdf_url: pdfUrls.join(','), 
      is_segmented: isSegmentMode,
      target_metadata: demographics,
      starts_at: new Date(startDate).toISOString(),
      expires_at: new Date(endDate).toISOString(),
      status: 'active'
    });

    if (!error) {
      alert('デジタル投函（チラシ配布）を開始しました！');
      reset();
      setPdfUrls([]);
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
              {/* ✅ リアルデータを反映 */}
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{totalStats.impressions.toLocaleString()}</p>
            </div>
            <div className="text-green-500 font-black text-[10px] bg-green-50 px-3 py-1 rounded-full">LIVE</div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">平均クリック率 (CTR)</p>
              {/* ✅ リアルデータを反映 */}
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
                      <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf" multiple />
                    </label>

                    {pdfUrls.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {pdfUrls.map((url, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                            <span className="text-[10px] font-black text-indigo-700 truncate max-w-[180px]">チラシデータ_{idx + 1}.pdf</span>
                            <button type="button" onClick={() => removeFile(idx)} className="text-indigo-300 hover:text-red-500">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* セグメントターゲット */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ターゲット属性の絞り込み</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'family', label: 'ファミリー層' },
                        { key: 'single', label: '単身者層' },
                        { key: 'senior', label: 'シニア層' },
                        { key: 'highIncome', label: '富裕層' }
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
                  <select {...register('property_id')} className="w-full bg-slate-50 p-5 rounded-2xl font-bold text-sm border-none outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="">配信先（マンション）を選択してください</option>
                    {targetProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
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
                        {/* 仮でインプレッションを表示 */}
                        <p className="text-xl font-black text-slate-900 leading-none">{(1200 - i * 100).toLocaleString()}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">開封数</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]" style={{ width: '65%' }}></div>
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