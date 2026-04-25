'use client';
import { useState, useEffect } from 'react';
// ✅ パスを ../../../ から ../../../../ に修正（4階層上へ）
import { supabase } from '../../../../lib/supabase';
import AdminLayout from '../../../../components/AdminLayout';

export default function AdminPostAdPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProps = async () => {
      // 依存関係が解決されているか確認
      if (!supabase) return;
      const { data } = await supabase.from('properties').select('id, name');
      if (data) setProperties(data);
    };
    fetchProps();
  }, []);

  const handlePost = async () => {
    if (!title || !content) return alert('タイトルと内容を入力してください。');
    setLoading(true);
    
    const targetProps = selectedPropertyId === 'all' ? properties.map(p => p.id) : [selectedPropertyId];
    
    const insertData = targetProps.map(pid => ({
      property_id: pid,
      title: title,
      content: content,
      store_name: "ぽすっと運営事務局",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }));

    const { error } = await supabase.from('local_ads').insert(insertData);
    if (!error) {
      alert('広告の配信が完了しました。');
      setTitle(''); setContent('');
    } else {
      alert('エラーが発生しました: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <AdminLayout userType="ADMIN">
      <div className="p-10 max-w-4xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-[2px] bg-blue-500"></span>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Direct Posting System</p>
          </div>
          <h1 className="text-4xl font-black italic text-slate-900 tracking-tighter uppercase">
            広告配信 <span className="text-blue-600">コントロール</span>
          </h1>
        </header>

        <div className="bg-white p-10 md:p-16 rounded-[4rem] shadow-2xl shadow-blue-900/5 border border-slate-100 space-y-10">
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">配信先ターゲット（物件選択）</label>
            <select 
              className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold text-slate-700 outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all appearance-none"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
            >
              <option value="all">📍 全ての管理物件に一括配信</option>
              {properties.map(p => <option key={p.id} value={p.id}>🏢 {p.name}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">広告タイトル</label>
            <input 
              className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold text-xl outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all" 
              value={title} 
              onChange={(e)=>setTitle(e.target.value)} 
              placeholder="例：【重要】全住民対象の特別なお知らせ" 
            />
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">配信メッセージ本文</label>
            <textarea 
              className="w-full p-8 bg-slate-50 rounded-[3rem] font-bold text-lg outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all min-h-[250px] leading-relaxed" 
              value={content} 
              onChange={(e)=>setContent(e.target.value)} 
              placeholder="ここに詳細な内容を入力してください。HTMLタグは使用できません。" 
            />
          </div>

          <button 
            onClick={handlePost} 
            disabled={loading} 
            className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-2xl italic tracking-tighter uppercase hover:bg-blue-600 transition-all active:scale-[0.98] shadow-2xl shadow-blue-900/20 disabled:opacity-50"
          >
            {loading ? 'POSTING...' : '今すぐポスティングを開始する'}
          </button>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em]">Posutto Admin Ad-Module v1.0</p>
        </footer>
      </div>
    </AdminLayout>
  );
}