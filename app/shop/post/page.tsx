'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';
import { useRouter } from 'next/navigation';

export default function ShopPostPage() {
  const router = useRouter();
  
  // 状態管理
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

  // ローディング・UI状態
  const [loading, setLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isMultiPost, setIsMultiPost] = useState(false);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);

  useEffect(() => {
    const initializePortal = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login?type=shop');
          return;
        }

        // ✅ 修正1: ロールの正規化（大文字に統一し、未定義を防ぐ）
        const role = user?.user_metadata?.role?.toUpperCase() || 'USER';
        const isAuthorized = role === 'ADMIN' || role === 'SHOP';

        if (!isAuthorized) {
          console.warn("Unauthorized role attempted access:", role);
          router.push('/login?type=shop');
          return;
        }

        // 1. 店舗情報を取得
        let storeQuery = supabase.from('stores').select('*');
        if (role === 'SHOP') {
          // SHOPユーザーは自分の所有する店舗のみ
          storeQuery = storeQuery.eq('owner_id', user.id);
        }
        
        const { data: storeData } = await storeQuery.limit(1).maybeSingle();
        let currentStore = storeData;

        // ✅ 修正2: ADMINかつ店舗データがDBにない場合のフォールバック
        // これがないと、DB紐付けが未完了のADMINが弾かれたり無限ロードになります
        if (!currentStore && role === 'ADMIN') {
          currentStore = {
            id: 'admin-preview-id',
            name: '管理者プレビュー店舗',
            lat: 35.6895,
            lng: 139.6917
          };
        }

        // 店舗データがある（またはプレビュー用がある）場合のみ続行
        if (currentStore) {
          setMyStore(currentStore);
          setStoreName(currentStore.name);

          // 2. 物件情報の取得
          if (currentStore.lat && currentStore.lng) {
            const { data: nearbyData } = await supabase.rpc('get_properties_within_radius', {
              target_lat: currentStore.lat,
              target_lng: currentStore.lng,
              radius_meters: 1000
            });

            if (role === 'ADMIN') {
              // ADMINは周辺の全物件を選択可能にする
              setAllowedProperties(nearbyData || []);
            } else {
              // SHOPは許可（permissions）がある物件のみ
              const { data: permissionData } = await supabase
                .from('store_property_permissions')
                .select('property_id')
                .eq('store_id', currentStore.id);

              const allowedIds = permissionData?.map(d => d.property_id) || [];
              if (nearbyData) {
                // DBの設計に合わせて uuid または id でフィルタリング
                const filteredProps = nearbyData.filter((p: any) => 
                  allowedIds.includes(p.uuid) || allowedIds.includes(p.id)
                );
                setAllowedProperties(filteredProps);
              }
            }
          }

          // 3. 配信履歴の取得 (プレビューIDでない場合のみ)
          if (currentStore.id !== 'admin-preview-id') {
            const { data: adsData } = await supabase
              .from('local_ads')
              .select('id, title, view_count, created_at, expires_at')
              .eq('store_id', currentStore.id)
              .order('created_at', { ascending: false })
              .limit(5);
            if (adsData) setRecentAds(adsData);
          }
        } else {
          // SHOP権限で店舗がない場合、エラーを表示してリダイレクト
          console.error("No store data found for this SHOP user.");
          router.push('/login?type=shop');
          return;
        }

      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initializePortal();
  }, [router]);

  // AIコピー生成ハンドラ
  const handleAIGenerate = async () => {
    const displayPropName = isMultiPost 
      ? (nearbyProperties[0]?.name || "周辺") 
      : (allowedProperties.find(p => (p.uuid === selectedPropertyId || p.id === selectedPropertyId))?.name || "物件");
    
    if (!storeName) return alert('店舗名を入力してください');
    setAiGenerating(true);
    
    const templates = [
      { t: `【${displayPropName}限定】${storeName}の特別優待`, c: `いつも${displayPropName}にお住まいの皆様へ。感謝を込めて限定クーポンをお届けします。` },
      { t: `住民様だけのシークレットセール`, c: `本日より${storeName}にて、${displayPropName}にお住まいの方限定の割引を実施中！` }
    ];
    const random = templates[Math.floor(Math.random() * templates.length)];
    
    setTimeout(() => {
      setTitle(random.t);
      setContent(random.c);
      setAiGenerating(false);
    }, 600);
  };

  // 周辺物件一括検索
  const handleNearbySearch = async () => {
    if (!myStore?.lat || !myStore?.lng) {
      alert('店舗の位置情報が設定されていません。');
      return;
    }
    const { data: nearby } = await supabase.rpc('get_properties_within_radius', {
      target_lat: myStore.lat,
      target_lng: myStore.lng,
      radius_meters: 500
    });
    setNearbyProperties(nearby || []);
    setIsMultiPost(true);
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myStore || myStore.id === 'admin-preview-id') {
      return alert('プレビューモードでは送信できません。実在する店舗アカウントでログインしてください。');
    }

    const targetIds = isMultiPost 
      ? nearbyProperties.map(p => p.uuid || p.id) 
      : [selectedPropertyId];
      
    if (targetIds.length === 0 || !targetIds[0]) return alert('配信先の物件を選択してください');
    
    setIsSubmitLoading(true);
    const insertData = targetIds.map(id => ({
      store_name: storeName,
      store_id: myStore.id,
      title, 
      content, 
      property_id: id,
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
      
      // 履歴を再取得
      const { data } = await supabase
        .from('local_ads')
        .select('id, title, view_count, created_at, expires_at')
        .eq('store_id', myStore.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setRecentAds(data);
    }
    setIsSubmitLoading(false);
  };

  if (loading) {
    return (
      <AdminLayout userType="SHOP">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-bold tracking-widest uppercase text-[10px]">Verifying Authority...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout userType="SHOP">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* メイン入力エリア */}
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
              {/* 配信モード切替 */}
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
                    {allowedProperties.map(p => (
                      <option key={p.uuid || p.id} value={p.uuid || p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] font-black text-indigo-600 mb-3 uppercase tracking-widest">一括配信対象: {nearbyProperties.length}物件</p>
                  <div className="flex flex-wrap gap-2">
                    {nearbyProperties.map(p => (
                      <span key={p.uuid || p.id} className="text-[10px] bg-white px-3 py-1 rounded-lg border border-indigo-100 text-indigo-800 font-medium">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 店名・タイトル */}
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

              {/* 広告内容 */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">広告内容</label>
                <textarea 
                  className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm h-32 focus:ring-2 focus:ring-blue-600 outline-none" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="住民への特典や詳細を記入..."
                />
              </div>

              {/* クーポン・URL・期限 */}
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
                disabled={isSubmitLoading || !myStore}
                className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black shadow-xl shadow-slate-200 transition active:scale-[0.98] mt-4"
              >
                {isSubmitLoading ? '配信中...' : isMultiPost ? '対象物件へ一括ポスティング' : 'デジタルポスティングを実行'}
              </button>
            </form>
          </div>
        </div>

        {/* サイドバー：分析・履歴 */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-xl border border-slate-800 text-white">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Real-time Analytics</h2>
            </div>
            <div className="space-y-6">
              {recentAds.map(ad => {
                const isExpired = ad.expires_at ? new Date(ad.expires_at) < new Date() : false;
                return (
                  <div key={ad.id} className="space-y-3 pb-4 border-b border-slate-800 last:border-0">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200 truncate w-32">{ad.title}</p>
                        <p className="text-[9px] text-slate-500">{new Date(ad.created_at).toLocaleDateString()}</p>
                      </div>
                      {isExpired ? (
                        <span className="text-[8px] font-black bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full uppercase">Expired</span>
                      ) : (
                        <span className="text-[8px] font-black bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full uppercase">Active</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {recentAds.length === 0 && <p className="text-[10px] text-slate-500 text-center py-4">配信履歴がありません</p>}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}