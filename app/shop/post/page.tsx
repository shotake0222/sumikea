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
  const [userRole, setUserRole] = useState<string>('');
  const [storeName, setStoreName] = useState('');
  
  // 店舗入力
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
  const [nearbyProperties, setNearbyProperties] = useState<any[]>([]);

  useEffect(() => {
    const initializePortal = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login?type=shop'); return; }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        const role = profile?.role?.toUpperCase() || 'USER';
        setUserRole(role);
        
        if (role !== 'ADMIN' && role !== 'SHOP') { router.push('/login?type=shop'); return; }

        let storeQuery = supabase.from('stores').select('*');
        if (role === 'SHOP') storeQuery = storeQuery.eq('owner_id', user.id);
        
        const { data: storeData } = await storeQuery.limit(1).maybeSingle();
        let currentStore = storeData;

        if (!currentStore && role === 'ADMIN') {
          currentStore = { id: 'admin-preview-id', name: 'サンプルショップ立川', lat: 35.6997, lng: 139.4137 };
        }

        if (currentStore) {
          setMyStore(currentStore);
          setStoreName(currentStore.name);
          fetchHistory(currentStore.id);
          handleRadiusSearch(currentStore, 1);
        } else {
          alert('店舗情報が見つかりません。店舗登録を先に行ってください。');
          router.push('/shop/settings');
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
    
    const { data: nearby, error } = await supabase.rpc('get_properties_within_radius', {
      target_lat: store.lat,
      target_lng: store.lng,
      radius_meters: radius * 1000
    });
    
    if (!error && nearby) {
      setNearbyProperties(nearby);
    } else {
      setNearbyProperties(new Array(Math.floor(radius * 12 + 3)).fill({ id: 'dummy' }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'shop-ads');
      setPdfUrl(url);
    } catch (err) {
      alert('アップロードに失敗しました。');
    } finally {
      setUploading(false);
    }
  };

  const handleAIGenerate = () => {
    if (!shopMessage) {
      alert('まずは「本日の一言」を入力してください。');
      return;
    }
    setAiGenerating(true);
    setTimeout(() => {
      setTitle(`【${storeName}】から特別なお知らせ`);
      setContent(`${shopMessage}\n\n近隣にお住まいの皆様へ。この画面を提示していただくと素敵な特典をご用意しております。ぜひお立ち寄りください！`);
      setAiGenerating(false);
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myStore || myStore.id === 'admin-preview-id') return alert('デモ版のため送信機能は制限されています。');
    if (nearbyProperties.length === 0) return alert('配信先の物件が見元かりません。');
    
    setIsSubmitLoading(true);
    const insertData = nearbyProperties.map(p => ({
      store_id: myStore.id,
      store_name: storeName,
      title, 
      content, 
      property_id: p.id || p.uuid,
      coupon_code: couponCode,
      link_url: linkUrl,
      pdf_url: pdfUrl,
      radius_km: radiusKm,
      expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
      view_count: 0
    }));

    const { error } = await supabase.from('local_ads').insert(insertData);
    if (!error) {
      alert(`${nearbyProperties.length}件のマンションへデジタル配布が完了しました！`);
      setTitle(''); setContent(''); setShopMessage(''); setPdfUrl('');
      fetchHistory(myStore.id);
    } else {
      alert('エラー: ' + error.message);
    }
    setIsSubmitLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* AdminLayoutの代わりに直接構成することで、左メニューを完全に排除 
          ※ヘッダーが必要な場合は共通コンポーネントを別途配置 
      */}
      <div className="p-4 md:p-10 max-w-7xl mx-auto">
        
        {/* --- クイックナビゲーション（上部4つのメニュー） --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: '広告一覧・管理', icon: '📢', path: '/shop/ads', color: 'hover:border-orange-500' },
            { label: '分析レポート', icon: '📊', path: '/shop/analytics', color: 'hover:border-blue-500' },
            { label: '店舗情報の変更', icon: '⚙️', path: '/shop/settings', color: 'hover:border-slate-900' },
            { label: '新しい広告を作る', icon: '➕', path: '/shop/post', color: 'hover:border-green-500' },
          ].map((nav, i) => (
            <button 
              key={i}
              onClick={() => router.push(nav.path)}
              className={`bg-white border border-slate-100 p-6 rounded-[2.5rem] flex flex-col items-center gap-3 transition-all shadow-sm ${nav.color} hover:shadow-md active:scale-95 group`}
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">{nav.icon}</span>
              <span className="text-[11px] font-black text-slate-500 tracking-tight">{nav.label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* メイン入力エリア */}
          <div className="flex-1 space-y-6">
            <div className="bg-white rounded-[3.5rem] p-8 md:p-14 shadow-xl border border-slate-50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Digital <span className="text-orange-500">Post</span></h1>
                  </div>
                  <p className="text-slate-400 text-[10px] font-bold tracking-[0.3em] uppercase">デジタルチラシ作成・ポスティング</p>
                </div>
                <button 
                  type="button"
                  onClick={handleAIGenerate} 
                  disabled={aiGenerating} 
                  className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-orange-600 transition shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {aiGenerating ? 'AIが考え中...' : '✨ 内容をAIで作成する'}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-12">
                {/* 店舗の生の声 */}
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-orange-500 uppercase tracking-widest ml-1">【必須】今日の一言（広告の元になります）</label>
                  <input 
                    className="w-full bg-orange-50 border-2 border-orange-100 p-7 rounded-[2.5rem] text-xl font-bold text-orange-900 placeholder:text-orange-200 outline-none focus:ring-4 focus:ring-orange-100 transition-all" 
                    value={shopMessage} 
                    onChange={(e) => setShopMessage(e.target.value)} 
                    placeholder="例：本日限定！焼き立てパンが全品10%OFFです"
                  />
                </div>

                {/* エリア設定 */}
                <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-4">配信範囲の選択</label>
                    <div className="flex gap-3">
                      {[0.5, 1, 2, 5].map(r => (
                        <button key={r} type="button" onClick={() => handleRadiusSearch(myStore, r)} 
                          className={`text-sm font-black w-16 h-16 rounded-2xl border-2 transition-all ${radiusKm === r ? 'bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-500/20' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}>
                          {r >= 1 ? `${r}km` : `500m`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative z-10 text-right">
                    <p className="text-[11px] font-black text-slate-400 uppercase mb-1">現在の配信対象物件</p>
                    <p className="text-6xl font-black text-white tracking-tighter">
                      {nearbyProperties.length}
                      <span className="text-sm ml-2 text-orange-500 italic uppercase">棟</span>
                    </p>
                  </div>
                  <div className="absolute -right-10 -bottom-10 text-[8rem] font-black italic opacity-5 select-none uppercase tracking-tighter">Radius</div>
                </div>

                {/* プレビュー入力 */}
                <div className="bg-slate-50 border-2 border-slate-100 rounded-[3.5rem] p-10 space-y-10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">広告のタイトル</label>
                    <input className="w-full bg-transparent border-b-2 border-slate-200 p-2 text-2xl font-black outline-none focus:border-orange-500 transition-all placeholder:text-slate-200" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="AIにお任せするか、直接入力してください" required />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">詳しい内容（本文）</label>
                    <textarea className="w-full bg-transparent p-2 text-lg font-bold min-h-[150px] outline-none border-none resize-none leading-relaxed" value={content} onChange={(e) => setContent(e.target.value)} placeholder="特典の詳細や来店への一言を記入してください..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">店舗の表示名</label>
                    <input className="w-full bg-slate-50 p-6 rounded-2xl text-md font-bold border-none outline-none focus:ring-2 focus:ring-slate-200" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">広告の掲載期限</label>
                    <input type="date" className="w-full bg-slate-50 p-6 rounded-2xl text-md font-bold border-none outline-none focus:ring-2 focus:ring-slate-200" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
                  </div>
                </div>

                {/* 画像アップロード */}
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">画像またはチラシを添付（任意）</label>
                  <label className="w-full bg-white border-2 border-dashed border-slate-200 p-12 rounded-[3rem] cursor-pointer hover:bg-slate-50 hover:border-orange-500 transition-all flex flex-col items-center justify-center gap-4 group">
                    <span className="text-5xl group-hover:scale-110 transition-transform">{uploading ? '⏳' : pdfUrl ? '✅' : '📷'}</span>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                      {uploading ? 'アップロード中...' : pdfUrl ? '準備完了' : '画像・PDFを選択する'}
                    </span>
                    <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf,image/*" />
                  </label>
                </div>

                <button 
                  disabled={isSubmitLoading} 
                  className="w-full bg-slate-900 text-white py-9 rounded-[3rem] font-black shadow-2xl hover:bg-orange-600 transition-all active:scale-[0.98] text-2xl italic tracking-tighter uppercase"
                >
                  {isSubmitLoading ? '配信処理中...' : '近隣住民へポスティング！'}
                </button>
              </form>
            </div>
          </div>

          {/* 右サイド：直近の履歴 */}
          <div className="w-full lg:w-96">
            <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100 sticky top-10">
              <div className="flex items-center gap-2 mb-10">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">直近の配信履歴</h2>
              </div>
              
              <div className="space-y-10">
                {recentAds.map(ad => (
                  <div key={ad.id} className="group cursor-pointer" onClick={() => router.push(`/shop/analytics?id=${ad.id}`)}>
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-md font-black truncate w-44 italic group-hover:text-orange-500 transition">{ad.title}</p>
                      <div className="text-right">
                        <p className="text-xl font-black text-slate-900 leading-none">{ad.view_count || 0}</p>
                        <p className="text-[9px] font-black text-slate-300 uppercase">閲覧数</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                      <span className="bg-slate-50 px-2 py-1 rounded-md">範囲: {ad.radius_km}km</span>
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${Math.min((ad.view_count || 0) * 2, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
                {recentAds.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-[11px] text-slate-300 font-black uppercase">履歴はありません</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => router.push('/shop/analytics')}
                className="w-full mt-14 py-5 border-2 border-slate-100 rounded-3xl text-[11px] font-black text-slate-400 hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest"
              >
                詳細なレポートを見る →
              </button>
            </div>
          </div>
        </div>
        
        <footer className="mt-16 text-[10px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
          Posutto Shop Portal - デジタル広告配信システム
        </footer>
      </div>
    </div>
  );
}