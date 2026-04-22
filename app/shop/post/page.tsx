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
  const [aiGenerating, setAiGenerating] = useState(false); // AI用状態

  useEffect(() => {
    const fetchProperties = async () => {
      const { data } = await supabase.from('properties').select('uuid, name');
      if (data) setProperties(data);
    };
    fetchProperties();
  }, []);

  // --- 追加：AIキャッチコピー生成機能 ---
  const handleAIGenerate = async () => {
    if (!selectedPropertyId || !storeName) return alert('物件と店舗名を入力してください');
    setAiGenerating(true);
    
    const targetProp = properties.find(p => p.uuid === selectedPropertyId);
    
    // DXポイント：物件名を含めた「自分事化」させるコピー案
    const templates = [
      { t: `【${targetProp.name}限定】${storeName}の特別優待`, c: `いつも${targetProp.name}にお住まいの皆様へ。感謝を込めて限定クーポンをお届けします。` },
      { t: `${targetProp.name}住民様だけのシークレットセール`, c: `本日より${storeName}にて、当マンションにお住まいの方限定の割引を実施中！` },
      { t: `【地域密着】${storeName}よりお知らせ`, c: `${targetProp.name}から徒歩圏内の当店で、住民様限定の特典をご用意しました。` }
    ];
    
    const random = templates[Math.floor(Math.random() * templates.length)];
    
    // 本来はここでAI API（Gemini等）を叩くが、今回は即戦力のテンプレートを自動注入
    setTimeout(() => {
      setTitle(random.t);
      setContent(random.c);
      setAiGenerating(false);
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) return alert('配信先の物件を選択してください');
    setLoading(true);
    
    const { error } = await supabase.from('local_ads').insert([
      { 
        store_name: storeName,
        title, 
        content, 
        property_id: selectedPropertyId,
        coupon_code: couponCode,
        link_url: linkUrl,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        view_count: 0
      }
    ]);

    if (error) {
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-800">🚀 デジタルポスティング</h1>
          {/* AIアシストボタンを追加 */}
          <button 
            type="button"
            onClick={handleAIGenerate}
            disabled={aiGenerating}
            className="text-[10px] font-bold bg-purple-100 text-purple-700 px-3 py-2 rounded-full hover:bg-purple-200 transition"
          >
            {aiGenerating ? '考案中...' : '✨ AI案を生成'}
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500">配信先物件</label>
            <select 
              className="w-full border p-3 rounded-xl mt-1 bg-gray-50 text-sm outline-none"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              required
            >
              <option value="">ポスティング先を選択</option>
              {properties.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500">店舗名</label>
            <input 
              className="w-full border p-3 rounded-xl mt-1 text-sm" 
              value={storeName} 
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="例：ひまわりベーカリー"
              required
            />
          </div>

          <div className="pt-2 border-t border-dashed">
            <label className="text-xs font-bold text-gray-500">キャッチコピー</label>
            <input 
              className="w-full border p-3 rounded-xl mt-1 text-sm font-bold bg-white" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="見出しを入力、またはAI生成"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500">内容</label>
            <textarea 
              className="w-full border p-3 rounded-xl mt-1 h-20 text-sm" 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              placeholder="特典や詳細を入力"
            />
          </div>

          {/* プレビュー表示を追加（DXの視覚化） */}
          {(title || content) && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-[9px] font-bold text-gray-400 mb-1">住民側の表示プレビュー</p>
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
              placeholder="クーポンコード"
            />
            <input 
              className="border p-3 rounded-xl text-sm" 
              value={linkUrl} 
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="URL（https://）"
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition"
          >
            {loading ? '配信中...' : 'デジタル広告を配信する'}
          </button>
        </form>
      </div>
    </div>
  );
}