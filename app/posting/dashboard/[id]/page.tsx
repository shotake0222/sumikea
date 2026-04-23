'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';

export default function NoticeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [notice, setNotice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndMarkRead = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. 記事詳細の取得
      const { data } = await supabase
        .from('property_notifications')
        .select('*, properties(name)')
        .eq('id', id)
        .single();
      
      setNotice(data);

      // 2. 既読ログの記録（UPSERTで重複防止）
      await supabase
        .from('notice_reads')
        .upsert({ 
          notice_id: id, 
          user_id: user.id,
          read_at: new Date().toISOString() 
        }, { onConflict: 'notice_id,user_id' });

      setLoading(false);
    };
    fetchAndMarkRead();
  }, [id]);

  if (loading) return <div className="p-10 text-center font-black animate-pulse">READING...</div>;

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="p-6 flex items-center justify-between border-b">
        <button onClick={() => router.back()} className="text-2xl">←</button>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notice Detail</span>
        <div className="w-8" />
      </header>

      <main className="p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase">
            {notice?.category}
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {new Date(notice?.created_at).toLocaleDateString()}
          </span>
        </div>

        <h1 className="text-3xl font-black text-slate-900 leading-tight mb-8 italic tracking-tighter">
          {notice?.title}
        </h1>

        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-lg mb-12">
          {notice?.content}
        </div>

        {notice?.pdf_url && (
          <a href={notice.pdf_url} target="_blank" className="block w-full bg-slate-900 text-white p-6 rounded-[2rem] text-center font-black shadow-xl transition active:scale-95">
            📎 添付資料を確認する (PDF)
          </a>
        )}
      </main>
    </div>
  );
}