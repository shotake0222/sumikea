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
    setGeneratedUrl('');

    try {
      // 1. 座標取得
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const geoData = await geoRes.json();
      const lat = geoData.results?.[0]?.geometry?.location?.lat || 35.6895;
      const lng = geoData.results?.[0]?.geometry?.location?.lng || 139.6917;

      // 2. DB保存
      // .select() を呼ぶことで、保存直後のレコード（UUIDを含む）を返り値として受け取ります
      const { data, error } = await supabase
        .from('properties')
        .insert([{ 
          name, 
          address, 
          location_lat: lat, 
          location_lng: lng 
        }])
        .select('*'); // すべてのカラムを返してもらう

      if (error) throw error;

      // 3. データの存在チェック
      if (data && data.length > 0) {
        const savedProperty = data[0]; // insert().select() は配列で返るため
        
        if (savedProperty.uuid) {
          // 成功！
          const url = `${window.location.origin}/${savedProperty.uuid}`;
          setGeneratedUrl(url);
          setName(''); 
          setAddress('');
        } else {
          // uuidカラム自体が空の場合
          alert("DBには保存されましたが、UUIDが生成されていません。SupabaseのDefault値設定を確認してください。");
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('エラーが発生しました: ' + (err.message || '不明なエラー'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">🏢 物件登録</h1>
      <form onSubmit={createProperty} className="space-y-4 mb-8">
        <input 
          className="w-full border p-3 rounded bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="物件名（例：スカイハイツ立川）" required
        />
        <input 
          className="w-full border p-3 rounded bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
          value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="住所（例：立川市柴崎町...）" required
        />
        <button 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
        >
          {loading ? '登録中...' : '登録してURL発行'}
        </button>
      </form>

      {generatedUrl && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl animate-in fade-in slide-in-from-bottom-2">
          <p className="text-sm text-green-700 font-bold mb-2 flex items-center">
            <span className="mr-1">✅</span> URLの発行に成功しました！
          </p>
          <input 
            readOnly 
            className="w-full p-2 bg-white border rounded text-sm mb-3 shadow-inner" 
            value={generatedUrl} 
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <a 
            href={generatedUrl} 
            target="_blank" 
            className="block text-center text-white bg-blue-500 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 shadow-sm"
          >
            住民ページを確認する
          </a>
        </div>
      )}
    </div>
  );
}