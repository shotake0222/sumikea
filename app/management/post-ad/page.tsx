'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';

export default function AdminPostAdPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [residentSegment, setResidentSegment] = useState('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // 配信対象の定義
  const targetOptions = [
    { id: 'posting_company', label: 'ポスティング会社', icon: '🚚' },
    { id: 'stores', label: '提携店舗', icon: '🏪' },
    { id: 'managers', label: '管理会社スタッフ', icon: '🛡️' },
  ];

  // 住民セグメントの定義
  const residentSegments = [
    { id: 'none', label: '住民には配信しない', icon: '🚫' },
    { id: 'all', label: '全住民', icon: '👥' },
    { id: 'newcomer', label: '入居3ヶ月以内の新規住民', icon: '✨' },
    { id: 'family', label: 'ファミリー層', icon: '🏠' },
    { id: 'single', label: '単身層', icon: '👤' },
  ];

  useEffect(() => {
    const fetchProps = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('properties').select('id, name');
      if (data) setProperties(data);
    };
    fetchProps();
  }, []);

  const toggleTarget = (id: string) => {
    setSelectedTargets(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handlePost = async () => {
    if (!title || !content) return alert('タイトルと内容を入力してください。');
    if (selectedTargets.length === 0 && residentSegment === 'none') {
      return alert('配信先を少なくとも1つ選択してください。');
    }
    
    setLoading(true);
    
    // 実際の運用では target_metadata などのカラムにセグメント情報を格納する想定
    const insertData = properties.map(prop => ({
      property_id: prop.id,
      title: title,
      content: content,
      store_name: "ぽすっと運営事務局",
      target_groups: selectedTargets, // ['posting_company', 'stores'] 等
      resident_segment: residentSegment,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }));

    const { error } = await supabase.from('local_ads').insert(insertData);
    if (!error) {
      alert('マルチターゲット配信が完了しました。');
      setTitle(''); setContent('');
      setSelectedTargets([]);
      setResidentSegment('all');
    } else {
      alert('エラーが発生しました: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <AdminLayout userType="ADMIN">
      <div className="p-10 max-w-5xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-[2px] bg-blue-600"></span>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Advanced Ad-Targeting System</p>
          </div>
          <h1 className="text-4xl font-black italic text-slate-900 tracking-tighter uppercase">
            マルチターゲット <span className="text-blue-600">配信制御</span>
          </h1>
        </header>

        <div className="bg-white p-10 md:p-16 rounded-[4rem] shadow-2xl shadow-blue-900/5 border border-slate-100 space-y-12">
          
          {/* 1. 業者・スタッフ向け配信設定 */}
          <div className="space-y-6">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">① 業者・ステークホルダー選択（複数選択可）</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {targetOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => toggleTarget(opt.id)}
                  className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-between font-bold ${
                    selectedTargets.includes(opt.id) 
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg shadow-blue-100' 
                    : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <span className="text-sm">{opt.icon} {opt.label}</span>
                  {selectedTargets.includes(opt.id) && <span className="text-blue-600">●</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 住民セグメント選択 */}
          <div className="space-y-6">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">② 住民セグメント（単一選択）</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {residentSegments.map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => setResidentSegment(seg.id)}
                  className={`p-4 rounded-2xl border-2 text-[10px] font-black transition-all flex flex-col items-center gap-2 text-center ${
                    residentSegment === seg.id 
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xl' 
                    : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl">{seg.icon}</span>
                  {seg.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-50" />

          {/* 3. コンテンツ入力 */}
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">広告タイトル</label>
              <input 
                className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold text-xl outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all" 
                value={title} 
                onChange={(e)=>setTitle(e.target.value)} 
                placeholder="例：【重要】配布スタッフ向け新マニュアル公開" 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">配信メッセージ本文</label>
              <textarea 
                className="w-full p-8 bg-slate-50 rounded-[3rem] font-bold text-lg outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all min-h-[200px] leading-relaxed" 
                value={content} 
                onChange={(e)=>setContent(e.target.value)} 
                placeholder="ターゲットに合わせた内容を入力してください。" 
              />
            </div>
          </div>

          <button 
            onClick={handlePost} 
            disabled={loading} 
            className="w-full bg-slate-900 text-white py-10 rounded-[3rem] font-black text-2xl italic tracking-tighter uppercase hover:bg-blue-600 transition-all active:scale-[0.98] shadow-2xl shadow-blue-900/20 disabled:opacity-50"
          >
            {loading ? 'POSTING...' : 'ターゲットへ配信を開始する'}
          </button>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em]">Posutto Ad-Engine v2.0 - Central Intelligence</p>
        </footer>
      </div>
    </AdminLayout>
  );
}