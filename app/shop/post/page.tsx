'use client';
import { useState } from 'react';
// 修正前: import { supabase } from '@/lib/supabase';
import { supabase } from '../../../lib/supabase'; // 3階層上の lib を指定

export default function ShopPostPage() {
  // ... (以下、元のコードと同じ)
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 実際は店舗に紐づくproperty_idをセッション等から取得
    const property_id = 'YOUR_PROPERTY_ID'; 

    const { error } = await supabase.from('local_ads').insert([
      { title, content, property_id, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
    ]);

    if (!error) {
      alert('広告を掲載しました！');
      setTitle(''); setContent('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white min-h-screen">
      <h1 className="text-xl font-bold mb-6">📢 店舗チラシ・クーポン投稿</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">タイトル（20文字以内）</label>
          <input 
            className="w-full border p-2 rounded" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：本日限定たまご半額！"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">詳細内容</label>
          <textarea 
            className="w-full border p-2 rounded h-32" 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
            placeholder="クーポンコード：SUMIKEA2026"
          />
        </div>
        <button 
          disabled={loading}
          className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold"
        >
          {loading ? '送信中...' : 'この内容で配信する'}
        </button>
      </form>
    </div>
  );
}