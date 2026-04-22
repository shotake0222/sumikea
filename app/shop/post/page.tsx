'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ShopPostPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(''); // ここにはuuidが入る
  const [storeName, setStoreName] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      // ポスティングDXの鍵：idではなくuuidを取得して紐付ける
      const { data } = await supabase.from('properties').select('uuid, name');
      if (data) setProperties(data);
    };
    fetchProperties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) return alert('配信先の物件を選択してください');
    
    setLoading(true);
    
    // DX仕様：閲覧ログの起点となるデータ構造で保存
    const { error } = await supabase.from('local_ads').insert([
      { 
        store_name: storeName,
        title, 
        content, 
        property_id: selectedPropertyId, // UUIDをセット
        coupon_code: couponCode,         // デジタルクーポン
        link_url: linkUrl,               // 店舗への送客リンク
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        view_count: 0                    // 初期値
      }
    ]);

    if (error) {
      console.error(error);
      alert('エラーが発生しました: ' + error.message);
    } else {
      alert('ターゲット物件へのデジタルポスティングが完了しました！');
      setTitle(''); setContent(''); setCouponCode(''); setLinkUrl('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
          <span className="mr-2">🚀</span> デジタルポスティング投稿
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 物件選択 */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">配信ターゲット物件</label>
            <select 
              className="w-full border p-3 rounded-xl mt-1 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              required
            >
              <option value="">物件を選択（ポスティング先）</option>
              {properties.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
            </select>
          </div>

          {/* 店名 */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">店舗名</label>
            <input 
              className="w-full border p-3 rounded-xl mt-1 text-sm" 
              value={storeName} 
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="例：ひまわりベーカリー"
              required
            />
          </div>

          {/* キャッチコピー */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">キャッチコピー（チラシの見出し）</label>
            <input 
              className="w-full border p-3 rounded-xl mt-1 text-sm font-bold" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：【住民限定】全品20%OFFクーポン配布中"
              required
            />
          </div>

          {/* 特典・内容 */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">特典・案内文</label>
            <textarea 
              className="w-full border p-3 rounded-xl mt-1 h-20 text-sm" 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              placeholder="例：焼きたてパンをご用意してお待ちしております。お会計時にこの画面をご提示ください。"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* クーポンコード */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">クーポンコード</label>
              <input 
                className="w-full border p-3 rounded-xl mt-1 text-sm font-mono" 
                value={couponCode} 
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="SAVE10"
              />
            </div>
            {/* リンクURL */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">詳細URL</label>
              <input 
                className="w-full border p-3 rounded-xl mt-1 text-sm" 
                value={linkUrl} 
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition transform active:scale-95 mt-4"
          >
            {loading ? 'ポスティング中...' : 'デジタル広告を配信する'}
          </button>
        </form>
      </div>
      
      <p className="text-[10px] text-gray-400 mt-6 text-center italic">
        ※配信された広告は、選択した物件の住民用ダッシュボードに即座に表示されます。
      </p>
    </div>
  );
}