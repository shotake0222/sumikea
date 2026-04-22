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

    let lat = 35.6895; // デフォルト（東京）
    let lng = 139.6917;

    try {
      // Google Geocoding API で住所を座標に変換
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const geoData = await geoRes.json();
      
      if (geoData.results && geoData.results[0]) {
        lat = geoData.results[0].geometry.location.lat;
        lng = geoData.results[0].geometry.location.lng;
      }

      // 座標を含めてDBに保存
      const { data, error } = await supabase
        .from('properties')
        .insert([{ 
          name, 
          address, 
          location_lat: lat, 
          location_lng: lng 
        }])
        .select()
        .single();

      if (!error && data) {
        setGeneratedUrl(`${window.location.origin}/${data.uuid}`);
        setName(''); setAddress('');
      }
    } catch (err) {
      alert('登録中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">🏢 物件登録・座標補完</h1>
      <form onSubmit={createProperty} className="space-y-4 mb-8">
        <div>
          <label className="text-sm font-medium text-gray-600">物件名</label>
          <input 
            className="w-full border p-3 rounded mt-1 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="例：スカイハイツ立川" required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">住所</label>
          <input 
            className="w-full border p-3 rounded mt-1 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="東京都立川市..." required
          />
          <p className="text-[10px] text-gray-400 mt-1">※この住所を元に周辺店舗を自動検索します</p>
        </div>
        <button 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg"
        >
          {loading ? '座標を取得中...' : '物件を登録してURL発行'}
        </button>
      </form>

      {generatedUrl && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in zoom-in duration-300">
          <p className="text-sm text-blue-700 font-bold mb-2">✅ 登録完了！住民用URL：</p>
          <input 
            readOnly 
            className="w-full p-2 bg-white border text-sm rounded shadow-inner" 
            value={generatedUrl} 
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
      )}
    </div>
  );
}