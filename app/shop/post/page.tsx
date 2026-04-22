'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ShopPostPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // 物件リストを読み込む
  useEffect(() => {
    const fetchProperties = async () => {
      const { data } = await supabase.from('properties').select('id, name');
      if (data) setProperties(data);
    };
    fetchProperties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) return alert('物件を選択してください');
    
    setLoading(true);
    const { error } = await supabase.from('local_ads').insert([
      { 
        title, 
        content, 
        property_id: selectedPropertyId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
      }
    ]);

    if (!error) {
      alert('広告を掲載しました！');
      setTitle(''); setContent('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white min-h-screen">
      <h1 className="text-xl font-bold mb-6 border-b pb-2">📢 店舗広告・クーポン投稿</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-sm font-medium">配信先の物件を選択</label>
          <select 
            className="w-full border p-3 rounded mt-1 bg-gray-50"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            required
          >
            <option value="">物件を選択してください</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {/* ...前回のタイトル・内容のinput... */}
        <button 
          disabled={loading}
          className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold shadow-lg"
        >
          {loading ? '送信中...' : 'この物件に配信する'}
        </button>
      </form>
    </div>
  );
}