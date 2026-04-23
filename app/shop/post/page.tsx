'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';
import { useRouter } from 'next/navigation';

export default function ShopPostPage() {
  const router = useRouter();
  const [myStore, setMyStore] = useState<any>(null);
  const [allowedProperties, setAllowedProperties] = useState<any[]>([]);
  
  const [recentAds, setRecentAds] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  
  const [expiresAt, setExpiresAt] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isMultiPost, setIsMultiPost] = useState(false);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);

  useEffect(() => {
    const initializePortal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. 店舗情報を取得
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      
      if (storeData) {
        setMyStore(storeData);
        setStoreName(storeData.name);

        // 2. 正確な半径1km以内の物件をDB(PostGIS)から取得
        if (storeData.lat && storeData.lng) {
          const { data: nearbyData } = await supabase.rpc('get_properties_within_radius', {
            target_lat: storeData.lat,
            target_lng: storeData.lng,
            radius_meters: 1000 // 1km制限
          });

          // 3. 運営が許可した物件リスト(permissions)を取得
          const { data: permissionData } = await supabase
            .from('store_property_permissions')
            .select('property_id')
            .eq('store_id', storeData.id);

          const allowedIds = permissionData?.map(d => d.property_id) || [];

          if (nearbyData) {
            // 「1km以内」かつ「運営の許可がある」物件だけを配信先リストにする
            const filteredProps = nearbyData.filter((p: any) => allowedIds.includes(p.uuid));
            setAllowedProperties(filteredProps);
          }
        }

        // 直近の配信履歴を取得
        const { data: adsData } = await supabase
          .from('local_ads')
          .select('id, title, view_count, created_at, expires_at')
          .eq('store_id', storeData.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (adsData) setRecentAds(adsData);
      }
    };
    initializePortal();
  }, [router]);

  // 周辺500m一括検索
  const handleNearbySearch = async () => {
    if (!myStore?.lat || !myStore?.lng) {
      alert('店舗の位置情報が設定されていません。');
      return;
    }

    const { data: nearby, error } = await supabase.rpc('get_properties_within_radius', {
      target_lat: myStore.lat,
      target_lng: myStore.lng,
      radius_meters: 500 // 一括配信はより狭い500m圏内
    });

    if (error) {
      alert('検索エラー: ' + error.message);
      return;
    }
    
    setNearbyProperties(nearby || []);
    setIsMultiPost(true);
  };

  const handleAIGenerate = async () => {
    const displayPropName = isMultiPost 
      ? (nearbyProperties[0]?.name || "周辺") 
      : (allowedProperties.find(p => p.uuid === selectedPropertyId)?.name || "物件");
    
    if (!storeName) return alert('店舗名を入力してください');
    
    setAiGenerating(true);
    const templates = [
      { t: `【${displayPropName}限定】${storeName}の特別優待`, c: `いつも${displayPropName}にお住まいの皆様へ。感謝を込めて限定クーポンをお届けします。` },
      { t: `住民様だけのシークレットセール`, c: `本日より${storeName}にて、${displayPropName}にお住まいの方限定の割引を実施中！` },
      { t: `【地域密着】${storeName}よりお知らせ`, c: `${displayPropName}から徒歩圏内の当店で、住民様限定の特典をご用意しました。` }
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
    if (!myStore) return alert('店舗セッションが有効ではありません');

    const targetIds = isMultiPost ? nearbyProperties.map(p => p.uuid) : [selectedPropertyId];
    if (targetIds.length === 0 || !targetIds[0]) return alert('配信先の物件を選択してください');
    
    setLoading(true);
    const insertData = targetIds.map(uuid => ({
      store_name: storeName,
      store_id: myStore.id,
      title, 
      content, 
      property_id: uuid,
      coupon_code: couponCode,
      link_url: linkUrl,
      expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
      view_count: 0
    }));

    const { error } = await supabase.from('local_ads').insert(insertData);
    if (error) {
      alert('エラー: ' + error.message);
    } else {
      alert(`${targetIds.length}件の物件へ配信完了しました！`);
      setTitle(''); setContent(''); setCouponCode(''); setLinkUrl('');
    }
    setLoading(false);
  };

  return (
    <AdminLayout userType="SHOP">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter">🚀 デジタルポスティング</h1>
              <button 
                type="button"
                onClick={handleAIGenerate}
                disabled={aiGenerating}
                className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full hover:bg-indigo-100 transition"
              >
                {aiGenerating ? '考案中...' : '✨ AIコピー生成'}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit">
                <button 
                  type="button"
                  onClick={() => setIsMultiPost(false)}
                  className={`px-6 py-2 text-xs font-bold rounded-xl transition ${!isMultiPost ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                >単体物件</button>
                <button 
                  type="button"
                  onClick={handleNearbySearch}
                  className={`px-6 py-2 text-xs font-bold rounded-xl transition ${isMultiPost ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                >周辺500m一括</button>
              </div>

              {!isMultiPost ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">配信先物件（半径1km以内）</label>
                  <select 
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    required={!isMultiPost}
                  >
                    <option value="">配信先を選択してください</option>
                    {allowedProperties.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-600 mb-3 uppercase tracking-widest">一括配信対象: {nearbyProperties.length}物件</p>
                  <div className="flex flex-wrap gap-2">
                    {nearbyProperties.map(p => (
                      <span key={p.uuid} className="text-[10px] bg-white px-3 py-1 rounded-lg border border-indigo-100 text-indigo-800 font-medium">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">表示店舗名</label>
                  <input 
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm" 
                    value={storeName} 
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="例：すみけあベーカリー"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">キャッチコピー</label>
                  <input 
                    className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm font-bold" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="見出しを入力"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">広告内容</label>
                <textarea 
                  className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm h-32 focus:ring-2 focus:ring-blue-600 outline-none" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="住民への特典や詳細を記入..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">クーポンコード</label>
                  <input className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm font-mono uppercase" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="SAVE10" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">詳細URL</label>
                  <input className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">掲載終了日</label>
                  <input type="date" className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
                </div>
              </div>

              <button 
                disabled={loading || !myStore}
                className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black shadow-xl shadow-slate-200 transition active:scale-[0.98] mt-4"
              >
                {loading ? '配信中...' : isMultiPost ? '対象物件へ一括ポスティング' : 'デジタルポスティングを実行'}
              </button>
            </form>
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">配信状況 (直近5件)</h2>
            <div className="space-y-4">
              {recentAds.map(ad => {
                const isExpired = ad.expires_at ? new Date(ad.expires_at) < new Date() : false;
                return (
                  <div key={ad.id} className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700 truncate w-32">{ad.title}</p>
                      {isExpired ? (
                        <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full uppercase">Expired</span>
                      ) : (
                        <span className="text-[8px] font-black bg-green-50 text-green-600 px-2 py-0.5 rounded-full uppercase">Active</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-blue-600">{ad.view_count}<span className="text-[8px] ml-0.5 text-slate-400">views</span></p>
                    </div>
                  </div>
                );
              })}
              {recentAds.length === 0 && <p className="text-[10px] text-slate-300">配信履歴がありません</p>}
            </div>
          </div>

          <div className="sticky top-24 bg-slate-900 rounded-[3rem] p-4 pt-12 pb-8 shadow-2xl relative border-[6px] border-slate-800">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-800 rounded-full"></div>
            <p className="text-[10px] text-center text-slate-500 font-bold mb-6 uppercase tracking-tighter">Smartphone Preview</p>
            <div className="bg-slate-50 rounded-[2rem] overflow-hidden min-h-[400px]">
              <div className="bg-white p-5 m-3 rounded-2xl shadow-sm border border-slate-100">
                <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded mb-2 inline-block uppercase">
                  {storeName || 'Store Name'}
                </span>
                <h3 className="text-sm font-black text-slate-800 leading-tight mb-2">
                  {title || 'ここに見出しが表示されます'}
                </h3>
                <p className="text-[11px] text-slate-500 line-clamp-3 mb-4">
                  {content || '住民の興味を引く内容を書きましょう。'}
                </p>
                {couponCode && (
                  <div className="bg-slate-900 text-white p-2 rounded-xl text-center">
                    <p className="text-[8px] opacity-60 uppercase">Code</p>
                    <p className="text-xs font-mono font-bold tracking-widest uppercase">{couponCode}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}