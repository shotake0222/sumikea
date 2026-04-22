'use client';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function AdminPropertyPage() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');

  const createProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('properties')
      .insert([{ name, address }])
      .select()
      .single();

    if (!error && data) {
      setGeneratedUrl(`${window.location.origin}/${data.uuid}`);
      setName(''); setAddress('');
    } else {
      alert('作成に失敗しました。DBの権限設定を確認してください。');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">🏢 物件管理パネル</h1>
      
      <form onSubmit={createProperty} className="space-y-4 mb-8">
        <div>
          <label className="text-sm font-medium text-gray-600">物件名</label>
          <input 
            className="w-full border p-3 rounded mt-1"
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="例：スカイハイツ立川" required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">住所</label>
          <input 
            className="w-full border p-3 rounded mt-1"
            value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="東京都立川市..." required
          />
        </div>
        <button 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
        >
          {loading ? '登録中...' : '新規物件を登録'}
        </button>
      </form>

      {generatedUrl && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-bold mb-2">✅ 物件URLが発行されました：</p>
          <input 
            readOnly 
            className="w-full p-2 bg-white border text-sm" 
            value={generatedUrl} 
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <p className="text-[10px] text-green-600 mt-2">このURLを住民の方へ配布してください。</p>
        </div>
      )}
    </div>
  );
}