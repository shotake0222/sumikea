'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';

export default function AdminPostAdPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProps = async () => {
      const { data } = await supabase.from('properties').select('id, name');
      if (data) setProperties(data);
    };
    fetchProps();
  }, []);

  const handlePost = async () => {
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
    }
    setLoading(false);
  };

  return (
    <AdminLayout userType="ADMIN">
      <div className="p-10 max-w-4xl mx-auto">
        <h1 className="text-3xl font-black italic mb-10">広告配信 <span className="text-blue-600">管理</span></h1>
        <div className="bg-white p-10 rounded-[3rem] shadow-xl space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">配信先ターゲット</label>
            <select 
              className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
            >
              <option value="all">全ての物件に配信</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">タイトル</label>
            <input className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="例：【重要】システムメンテナンスのお知らせ" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">配信内容</label>
            <textarea className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none min-h-[200px]" value={content} onChange={(e)=>setContent(e.target.value)} placeholder="配信するメッセージを入力してください..." />
          </div>
          <button onClick={handlePost} disabled={loading} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-blue-600 transition-all">
            {loading ? '送信中...' : '配信を開始する'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}