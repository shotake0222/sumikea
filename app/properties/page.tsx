'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminPropertyPage() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');

  const createProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedUrl(''); // 一旦リセット

    try {
      // 1. 座標取得
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const geoData = await geoRes.json();
      const lat = geoData.results?.[0]?.geometry?.location?.lat || 35.6895;
      const lng = geoData.results?.[0]?.geometry?.location?.lng || 139.6917;

      // 2. DB保存（必ず .select('uuid') をつけて戻り値をもらう）
      const { data, error } = await supabase
        .from('properties')
        .insert([{ 
          name, 
          address, 
          location_lat: lat, 
          location_lng: lng 
        }])
        .select('uuid') // 明示的にuuidを取得
        .single();

      if (error) throw error;

      if (data && data.uuid) {
        // 成功：uuidを使ってURLを生成
        const url = `${window.location.origin}/${data.uuid}`;
        setGeneratedUrl(url);
        setName(''); setAddress('');
      } else {
        alert("DB登録はできましたが、UUIDが返ってきませんでした。");
      }
    } catch (err: any) {
      console.error(err);
      alert('エラー: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">🏢 物件登録</h1>
      <form onSubmit={createProperty} className="space-y-4 mb-8">
        <input 
          className="w-full border p-3 rounded bg-gray-50"
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="物件名" required
        />
        <input 
          className="w-full border p-3 rounded bg-gray-50"
          value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="住所" required
        />
        <button 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold"
        >
          {loading ? '登録中...' : '登録してURL発行'}
        </button>
      </form>

      {generatedUrl && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-bold mb-2">✅ 発行されたURL：</p>
          <input readOnly className="w-full p-2 bg-white border rounded text-sm" value={generatedUrl} />
          <a href={generatedUrl} target="_blank" className="text-blue-600 underline text-xs mt-2 block">
            別タブで開いてテストする
          </a>
        </div>
      )}
    </div>
  );
}