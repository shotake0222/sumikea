'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ShopPostPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // --- 【拡張B】追加の状態管理 ---
  const [isMultiPost, setIsMultiPost] = useState(false);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);

  useEffect(() => {
    const fetchProperties = async () => {
      // 拡張用に緯度経度(lat, lng)も取得するように変更
      const { data } = await supabase.from('properties').select('uuid, name, lat, lng');
      if (data) setProperties(data);
    };
    fetchProperties();
  }, []);

  // --- 【拡張B】周辺物件の自動抽出ロジック ---
  const handleNearbySearch = async () => {
    // 実際の実装では店舗の登録住所から座標を取得しますが、
    // ここではデモ用に「立川駅付近」の座標を基準にフィルタリングします
    const shopLat = 35.698; 
    const shopLng = 139.413;

    // クライアント側で簡易計算（500m圏内）
    const filtered = properties.filter(p => {
      if (!p.lat || !p.lng) return false;
      const dist = Math.sqrt(Math.pow(p.lat - shopLat, 2) + Math.pow(p.lng - shopLng, 2));
      return dist < 0.005; // 緯度経度の差による簡易500m判定
    });

    setNearbyProperties(filtered);
    setIsMultiPost(true);
  };

  const handleAIGenerate = async () => {
    // 一括配信時は最初の物件名を参考にする
    const displayPropName = isMultiPost ? (nearbyProperties[0]?.name || "周辺") : (properties.find(p => p.uuid === selectedPropertyId)?.name || "");
    if (!displayPropName || !storeName) return alert('物件（または一括モード）と店舗名を確認してください');
    
    setAiGenerating(true);
    const templates = [
      { t: `【${displayPropName}限定】${storeName}の特別優待`, c: `いつも近隣にお住まいの皆様へ。${storeName}より感謝を込めて限定クーポンをお届けします。` },
      { t: `住民様だけのシークレットセール`, c: `本日より${storeName}にて、指定マンションにお住まいの方限定の割引を実施中！` }
    ];
    const random = templates[Math.floor(Math.random() * templates.length)];
    
    setTimeout(() => {
      setTitle(random.t);
      setContent(random.c);
      setAiGenerating(false);
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetIds = isMultiPost ? nearbyProperties.map(p => p.uuid) : [selectedPropertyId];
    
    if (targetIds.length === 0 || !targetIds[0]) return alert('配信先の物件を選択してください');
    setLoading(true);
    
    // 一括配信用のデータ配列を作成
    const insertData = targetIds.map(uuid => ({
      store_name: storeName,
      title, 
      content, 
      property_id: uuid,
      coupon_code: couponCode,
      link_url: linkUrl,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      view_count: 0
    }));

    const { error } = await supabase.from('local_ads').insert(insertData);

    if (error) {
      alert('エラーが発生しました: ' + error.message);
    } else {
      alert(`${targetIds.length}件の物件へデジタルポスティングが完了しました！`);
      setTitle(''); setContent(''); setCouponCode(''); setLinkUrl('');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-800 tracking-tighter">🚀 マルチポスティング</h1>
          <button 
            type="button"
            onClick={handleAIGenerate}
            disabled={aiGenerating}
            className="text-[10px] font-bold bg-purple-100 text-purple-700 px-3 py-2 rounded-full"
          >
            {aiGenerating ? '考案中...' : '✨ AI案を生成'}
          </button>
        </div>
        
        {/* 【拡張B】モード切替UI */}
        <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
          <button 
            type="button"
            onClick={() => setIsMultiPost(false)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${!isMultiPost ? 'bg-white shadow-sm' : 'text-gray-400'}`}
          >単体配信</button>
          <button 
            type="button"
            onClick={handleNearbySearch}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${isMultiPost ? 'bg-white shadow-sm' : 'text-gray-400'}`}
          >周辺500m一括</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isMultiPost ? (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">配信先物件</label>
              <select 
                className="w-full border p-3 rounded-xl mt-1 bg-gray-50 text-sm outline-none"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                required={!isMultiPost}
              >
                <option value="">物件を選択</option>
                {properties.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mb-4">
              <p className="text-[10px] font-bold text-blue-600 mb-2 uppercase tracking-widest">一括配信対象: {nearbyProperties.length}物件</p>
              <div className="flex flex-wrap gap-1">
                {nearbyProperties.map(p => (
                  <span key={p.uuid} className="text-[9px] bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

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

          <div className="pt-2 border-t border-dashed">
            <label className="text-xs font-bold text-gray-500 uppercase">キャッチコピー</label>
            <input 
              className="w-full border p-3 rounded-xl mt-1 text-sm font-bold bg-white" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="見出しを入力"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">案内文</label>
            <textarea 
              className="w-full border p-3 rounded-xl mt-1 h-20 text-sm" 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              placeholder="特典の内容など"
            />
          </div>

          {/* プレビュー */}
          {(title || content) && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-[9px] font-bold text-gray-400 mb-1 tracking-widest">住民側表示イメージ</p>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-200">
                <p className="text-xs font-bold text-orange-600">{storeName || '店舗名'}</p>
                <p className="text-sm font-black text-gray-800">{title}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <input 
              className="border p-3 rounded-xl text-sm font-mono" 
              value={couponCode} 
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="SAVE10"
            />
            <input 
              className="border p-3 rounded-xl text-sm" 
              value={linkUrl} 
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="URL"
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition active:scale-95 mt-4"
          >
            {loading ? '一括配信中...' : isMultiPost ? '全物件へ一括配信する' : 'デジタル広告を配信する'}
          </button>
        </form>
      </div>
    </div>
  );
}