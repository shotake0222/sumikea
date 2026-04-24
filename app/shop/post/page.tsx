'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';
import { useRouter } from 'next/navigation';
import { uploadImage } from '../../../lib/upload';

export default function ShopPostPage() {
  const router = useRouter();
  
  // 状態管理
  const [myStore, setMyStore] = useState<any>(null);
  const [recentAds, setRecentAds] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [storeName, setStoreName] = useState('');
  
  // 店舗入力：一言
  const [shopMessage, setShopMessage] = useState('');
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [radiusKm, setRadiusKm] = useState(1);
  const [expiresAt, setExpiresAt] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // UI状態
  const [loading, setLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isMultiPost, setIsMultiPost] = useState(false);
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);

  useEffect(() => {
    const initializePortal = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login?type=shop'); return; }

        // ロール確認
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const role = profile?.role?.toUpperCase() || 'USER';
        
        if (role !== 'ADMIN' && role !== 'SHOP') { router.push('/login?type=shop'); return; }

        let storeQuery = supabase.from('stores').select('*');
        if (role === 'SHOP') storeQuery = storeQuery.eq('owner_id', user.id);
        
        const { data: storeData } = await storeQuery.limit(1).maybeSingle();
        let currentStore = storeData;

        // 管理者プレビュー用
        if (!currentStore && role === 'ADMIN') {
          currentStore = { id: 'admin-preview-id', name: 'サンプルショップ立川', lat: 35.6997, lng: 139.4137 };
        }

        if (currentStore) {
          setMyStore(currentStore);
          setStoreName(currentStore.name);
          fetchHistory(currentStore.id);
          // 初期値で1km圏内を検索
          handleRadiusSearch(currentStore, 1);
        } else {
          // 店舗登録がない場合は登録画面へ（将来的に作成）
          alert('店舗情報が見つかりません。');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initializePortal();
  }, [router]);

  const fetchHistory = async (storeId: string) => {
    if (storeId === 'admin-preview-id') return;
    const { data } = await supabase
      .from('local_ads')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentAds(data);
  };

  const handleRadiusSearch = async (store: any, radius: number) => {
    if (!store?.lat || !store?.lng) return;
    setRadiusKm(radius);
    
    // 実際にDBにrpc関数がある想定、なければモックデータをセット
    const { data: nearby, error } = await supabase.rpc('get_properties_within_radius', {
      target_lat: store.lat,
      target_lng: store.lng,
      radius_meters: radius * 1000
    });
    
    if (!error && nearby) {
      setNearbyProperties(nearby);
    } else {
      // デモ用：仮の物件数
      setNearbyProperties(new Array(Math.floor(radius * 12)).fill({}));
    }
    setIsMultiPost(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'shop-ads');
      setPdfUrl(url);
    } catch (err) {
      alert('アップロード失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleAIGenerate = () => {
    if (!shopMessage) {
      alert('まずは「本日の一言」を入力してください。AIがそれを元に広告を作成します。');
      return;
    }
    setAiGenerating(true);
    setTimeout(() => {
      setTitle(`【${storeName}】から特別なお知らせ`);
      setContent(`${shopMessage}\n\n近隣にお住まいの皆様へ、いつもありがとうございます。この画面を提示で素敵な特典があるかも？ぜひお立ち寄りください！`);
      setAiGenerating(false);
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myStore || myStore.id === 'admin-preview-id') return alert('デモ版では送信できません');

    const targetIds = nearbyProperties.map(p => p.id || p.uuid);
    if (targetIds.length === 0) return alert('配信先の物件が見つかりません。エリアを広げてください。');
    
    setIsSubmitLoading(true);
    
    // 各物件に対して広告をインサート
    const insertData = targetIds.map(id => ({
      store_id: myStore.id,
      store_name: storeName,
      title, 
      content, 
      property_id: id,
      coupon_code: couponCode,
      link_url: linkUrl,
      pdf_url: pdfUrl,
      radius_km: radiusKm,
      expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
      view_count: 0
    }));

    const { error } = await supabase.from('local_ads').insert(insertData);
    if (!error) {
      alert(`${targetIds.length}件のマンション住民へポスティング完了しました！`);
      setTitle(''); setContent(''); setShopMessage(''); setPdfUrl('');
      fetchHistory(myStore.id);
    } else {
      alert('エラーが発生しました: ' + error.message);
    }
    setIsSubmitLoading(false);
  };

  if (loading) return (
    <div className="p-20 text-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="font-black text-slate-400 uppercase tracking-widest">Loading Shop Portal...</p>
    </div>
  );

  return (
    <AdminLayout userType="SHOP">
      <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-8 bg-[#F8FAFC]">
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Digital Posting System</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">デジタルポスティング</h1>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 mb-2 uppercase">AIアシスト機能</p>
                <button onClick={handleAIGenerate} disabled={aiGenerating} className="w-full text-[10px] font-black bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-orange-500 transition shadow-lg active:scale-95">
                  {aiGenerating ? '生成中...' : '✨ 内容をAIで作成する'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* 店舗の生の声 */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-1">本日の一言（広告のベースになります）</label>
                <input 
                  className="w-full bg-orange-50 border-2 border-orange-100 p-6 rounded-[2rem] text-lg font-bold text-orange-900 placeholder:text-orange-200 outline-none focus:ring-4 focus:ring-orange-100 transition-all" 
                  value={shopMessage} 
                  onChange={(e) => setShopMessage(e.target.value)} 
                  placeholder="例：焼きたてのメロンパンが14時にあがります！"
                />
              </div>

              {/* エリア設定 */}
              <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">配信エリア（半径）</label>
                  <div className="flex gap-3">
                    {[0.5, 1, 2, 5].map(r => (
                      <button key={r} type="button" onClick={() => handleRadiusSearch(myStore, r)} 
                        className={`text-sm font-black w-14 h-14 rounded-2xl border-2 transition-all ${radiusKm === r ? 'bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-500/20' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}>
                        {r >= 1 ? `${r}km` : `500m`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative z-10 text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">現在の推定リーチ数</p>
                  <p className="text-5xl font-black text-white tracking-tighter">
                    {nearbyProperties.length}
                    <span className="text-sm ml-2 text-orange-500 italic uppercase">Properties</span>
                  </p>
                </div>
                <div className="absolute -right-10 -bottom-10 text-[8rem] font-black italic opacity-5 select-none uppercase">Radius</div>
              </div>

              {/* 入力エリア */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">店舗名（表示用）</label>
                  <input className="w-full bg-slate-50 p-5 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-200" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">掲載終了日</label>
                  <input type="date" className="w-full bg-slate-50 p-5 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-200" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
                </div>
              </div>

              {/* プレビューエリア */}
              <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 space-y-8 shadow-sm">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">広告タイトル</label>
                  <input className="w-full bg-transparent border-b-2 border-slate-100 p-2 text-2xl font-black outline-none focus:border-orange-500 transition-all placeholder:text-slate-200" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="AIボタンで生成するか入力" required />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">広告本文</label>
                  <textarea className="w-full bg-transparent p-2 text-md font-bold min-h-[120px] outline-none border-none resize-none leading-relaxed" value={content} onChange={(e) => setContent(e.target.value)} placeholder="詳しい内容や特典などを入力してください..." />
                </div>
              </div>

              {/* アップロード */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">チラシ画像・PDF（任意）</label>
                <label className="w-full bg-slate-50 border-2 border-dashed border-slate-200 p-10 rounded-[2.5rem] cursor-pointer hover:bg-slate-100 hover:border-orange-200 transition-all flex flex-col items-center justify-center gap-4">
                  <span className="text-4xl">{uploading ? '⏳' : pdfUrl ? '✅' : '📁'}</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {uploading ? 'アップロード中...' : pdfUrl ? 'ファイル準備完了' : 'クリックしてチラシを添付'}
                  </span>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf,image/*" />
                </label>
              </div>

              <button disabled={isSubmitLoading} className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black shadow-2xl shadow-slate-200 hover:bg-orange-600 transition-all active:scale-[0.98] text-xl italic tracking-tighter uppercase">
                {isSubmitLoading ? '配信処理中...' : '近隣住民へポスティング！'}
              </button>
            </form>
          </div>
        </div>

        {/* サイドバー：配信実績 */}
        <div className="w-full lg:w-96">
          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 sticky top-10">
            <div className="flex items-center gap-2 mb-10">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">配信実績レポート</h2>
            </div>
            
            <div className="space-y-8">
              {recentAds.map(ad => (
                <div key={ad.id} className="group cursor-pointer" onClick={() => router.push(`/shop/analytics?id=${ad.id}`)}>
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-md font-black truncate w-40 italic group-hover:text-orange-500 transition">{ad.title}</p>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900 leading-none">{ad.view_count || 0}</p>
                      <p className="text-[8px] font-black text-slate-300 uppercase">Views</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                    <span className="bg-slate-50 px-2 py-1 rounded-md">半径 {ad.radius_km}km</span>
                  </div>
                  <div className="mt-4 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${Math.min((ad.view_count || 0) * 2, 100)}%` }}></div>
                  </div>
                </div>
              ))}
              {recentAds.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">履歴がありません</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => router.push('/shop/analytics')}
              className="w-full mt-12 py-4 border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all uppercase tracking-widest"
            >
              詳細レポートを表示 →
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}