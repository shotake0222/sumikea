'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';

export default function ManagementNoticePage() {
  const [myProperties, setMyProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [noticeTarget, setNoticeTarget] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchMyProperties();
  }, []);

  const fetchMyProperties = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 自分が管理担当（management_id）になっている物件のみ取得
    const { data } = await supabase
      .from('properties')
      .select('uuid, name')
      .eq('management_id', user.id);
    
    if (data) setMyProperties(data);
  };

  const handlePostNotice = async (propertyId: string) => {
    if (!title || !content) return alert('入力してください');
    setLoading(true);
    
    const { error } = await supabase.from('property_notices').insert([
      {
        property_id: propertyId,
        title: title,
        content: content,
        priority: 'NORMAL'
      }
    ]);

    if (!error) {
      alert('掲示板に掲載しました');
      setNoticeTarget(null);
      setTitle('');
      setContent('');
    }
    setLoading(false);
  };

  return (
    <AdminLayout userType="MANAGEMENT">
      <div className="space-y-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tighter">担当物件の掲示板管理</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myProperties.map(prop => (
            <div key={prop.uuid} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">{prop.name}</h2>
              <button 
                onClick={() => setNoticeTarget(prop.uuid)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm"
              >
                ＋ 新しいお知らせを投稿
              </button>
            </div>
          ))}
        </div>

        {/* 投稿フォームモーダル風 */}
        {noticeTarget && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl">
              <h3 className="text-xl font-black mb-6">お知らせを作成</h3>
              <div className="space-y-4">
                <input 
                  className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm" 
                  placeholder="件名（例：清掃作業のお知らせ）"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea 
                  className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm h-40" 
                  placeholder="詳細内容を入力してください..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setNoticeTarget(null)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">キャンセル</button>
                  <button 
                    onClick={() => handlePostNotice(noticeTarget)}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100"
                  >
                    投稿する
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}