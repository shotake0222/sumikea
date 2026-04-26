'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { uploadImage } from '@/lib/upload';

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
  const [targetType, setTargetType] = useState('all'); 
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
        if (!user) { 
          router.push('/login?type=shop'); 
          return; 
        }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        const role = profile?.role?.toUpperCase() || 'USER';
        setUserRole(role);
        
        // ==========================================
        // 🚨 【修正】一般ユーザーの迷い込みガード
        // ==========================================
        if (role === 'USER') {
          alert('このアカウントは店舗用ではありません。住民用画面へ移動します。');
          router.push('/resident/dashboard'); // 住民用ダッシュボードへ誘導
          return;
        }

        if (role !== 'ADMIN' && role !== 'SHOP') { 
          alert('アクセス権限がありません。');
          await supabase.auth.signOut();
          router.push('/login?type=shop'); 
          return; 
        }

        let storeQuery = supabase.from('stores').select('*');
        if (role === 'SHOP') storeQuery = storeQuery.eq('owner_id', user.id);
        
        const { data: storeData } = await storeQuery.limit(1).maybeSingle();
        let currentStore = storeData;

        // 管理者プレビュー用のダミーUUID
        if (!currentStore && role === 'ADMIN') {
          currentStore = { 
            id: '00000000-0000-0000-0000-000000000000', 
            name: 'サンプルショップ立川', 
            lat: 35.6997, 
            lng: 139.4137 
          };
        }

        if (currentStore) {
          setMyStore(currentStore);
          setStoreName(currentStore.name);
          fetchHistory(currentStore.id);
          await handleRadiusSearch(currentStore, 1, 'all');
        } else {
          // SHOPロールなのに店舗がない場合のみ、設定画面へ
          alert('店舗情報の登録が必要です。設定画面へ移動します。');
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
    if (storeId?.startsWith('00000000')) return;
    const { data } = await supabase
      .from('local_ads')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentAds(data);
  };

  const handleRadiusSearch = async (store: any, radius: number, type: string) => {
    if (!store?.lat || !store?.lng) return;
    setRadiusKm(radius);
    setTargetType(type);
    
    const { data: nearby, error } = await supabase.rpc('get_properties_within_radius_v2', {
      target_lat: store.lat,
      target_lng: store.lng,
      radius_meters: radius * 1000,
      target_type: type
    });
    
    if (!error && nearby) {
      setNearbyProperties(nearby);
    } else {
      console.error('物件検索エラー:', error);
      setNearbyProperties([]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'sumikea-images', 'shop-ads');
      setPdfUrl(url);
    } catch (err: any) {
      alert(`アップロード失敗: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
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
    if (!myStore) return;
    if (nearbyProperties.length === 0) return alert('配信先の物件が見つかりません。範囲を広げてください。');
    if (!title || !content) return alert('タイトルと本文を入力してください。');
    
    setIsSubmitLoading(true);
    
    try {
      const insertData = nearbyProperties.map(p => ({
        store_id: myStore.id,
        store_name: storeName,
        title, 
        content, 
        property_id: p.id,
        coupon_code: couponCode || null,
        link_url: linkUrl || null,
        pdf_url: pdfUrl || null,
        radius_km: radiusKm,
        target_segment: targetType,
        expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
        view_count: 0
      }));

      const { error } = await supabase.from('local_ads').insert(insertData);
      if (error) throw error;

      alert(`${nearbyProperties.length}件のマンションへ配信予約が完了しました！`);
      
      setTitle(''); 
      setContent(''); 
      setShopMessage(''); 
      setPdfUrl('');
      fetchHistory(myStore.id);

    } catch (err: any) {
      console.error("Submit Error:", err);
      alert('配信に失敗しました: ' + err.message);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="p-4 md:p-10 max-w-7xl mx-auto">
        
        {/* ナビゲーションボタン */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {[
            { label: '過去の広告一覧・管理', icon: '📢', path: '/shop/ads', color: 'hover:border-orange-500' },
            { label: '閲覧・分析レポート', icon: '📊', path: '/shop/analytics', color: 'hover:border-blue-500' },
          ].map((nav, i) => (
            <button 
              key={i}
              onClick={() => router.push(nav.path)}
              className={`bg-white border border-slate-100 p-8 rounded-[2.5rem] flex items-center justify-center gap-6 transition-all shadow-sm ${nav.color} hover:shadow-md active:scale-95 group`}
            >
              <span className="text-4xl group-hover:scale-110 transition-transform">{nav.icon}</span>
              <span className="text-sm font-black text-slate-700 tracking-widest uppercase">{nav.label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div className="bg-white rounded-[3.5rem] p-8 md:p-14 shadow-xl border border-slate-50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Segment <span className="text-orange-500">Post</span></h1>
                  </div>
                  <p className="text-slate-400 text-[10px] font-bold tracking-[0.3em] uppercase underline decoration-orange-500/30 underline-offset-4">ターゲットを絞って効率的にポスティング</p>
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
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-orange-500 uppercase tracking-widest ml-1 italic">【必須】今日の一言・アピール</label>
                  <input 
                    className="w-full bg-orange-50 border-2 border-orange-100 p-7 rounded-[2.5rem] text-xl font-bold text-orange-900 placeholder:text-orange-200 outline-none focus:ring-4 focus:ring-orange-100 transition-all" 
                    value={shopMessage} 
                    onChange={(e) => setShopMessage(e.target.value)} 
                    placeholder="例：本日限定！焼き立てパンが全品10%OFFです"
                    required
                  />
                </div>

                {/* 配信設定カード */}
                <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white space-y-8 shadow-2xl relative overflow-hidden">
                  <div className="grid md:grid-cols-2 gap-8 relative z-10">
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-4">① 配信ターゲット</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'all', label: '全対象' },
                          { id: 'single', label: '単身者向け' },
                          { id: 'family', label: 'ファミリー向け' }
                        ].map(t => (
                          <button key={t.id} type="button" onClick={() => handleRadiusSearch(myStore, radiusKm, t.id)} 
                            className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${targetType === t.id ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-4">② 配信範囲（半径）</label>
                      <div className="flex gap-2">
                        {[0.5, 1, 2, 5].map(r => (
                          <button key={r} type="button" onClick={() => handleRadiusSearch(myStore, r, targetType)} 
                            className={`w-12 h-12 rounded-xl border-2 text-[10px] font-black transition-all ${radiusKm === r ? 'bg-white text-slate-900 border-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                            {r >= 1 ? `${r}k` : `500`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 pt-6 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-orange-500 uppercase mb-1 italic">Estimation</p>
                      <p className="text-sm font-bold text-slate-300">
                        {radiusKm}km圏内の <span className="text-white">{targetType === 'all' ? 'すべて' : targetType === 'single' ? '単身' : 'ファミリー'}物件</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-6xl font-black text-white tracking-tighter">
                        {nearbyProperties.length}
                        <span className="text-sm ml-2 text-orange-500 italic uppercase">棟</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 広告内容 */}
                <div className="bg-slate-50 border-2 border-slate-100 rounded-[3.5rem] p-10 space-y-10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">広告の見出し（タイトル）</label>
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
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">掲載終了日</label>
                    <input type="date" className="w-full bg-slate-50 p-6 rounded-2xl text-md font-bold border-none outline-none focus:ring-2 focus:ring-slate-200" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">画像またはデジタルチラシ（任意）</label>
                  <label className="w-full bg-white border-2 border-dashed border-slate-200 p-12 rounded-[3rem] cursor-pointer hover:bg-slate-50 hover:border-orange-500 transition-all flex flex-col items-center justify-center gap-4 group">
                    <span className="text-5xl group-hover:scale-110 transition-transform">{uploading ? '⏳' : pdfUrl ? '✅' : '📷'}</span>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                      {uploading ? 'アップロード中...' : pdfUrl ? 'ファイルを変更する' : '写真・PDFをアップロード'}
                    </span>
                    <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf,image/*" />
                  </label>
                </div>

                <button 
                  disabled={isSubmitLoading} 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-9 rounded-[3rem] font-black shadow-2xl hover:bg-orange-600 transition-all active:scale-[0.98] text-2xl italic tracking-tighter uppercase disabled:opacity-50"
                >
                  {isSubmitLoading ? '配信処理中...' : 'ターゲットへポスティング！'}
                </button>
              </form>
            </div>
          </div>

          {/* 右サイドバー：履歴 */}
          <div className="w-full lg:w-96">
            <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100 sticky top-10">
              <div className="flex items-center gap-2 mb-10">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">最新の配信ステータス</h2>
              </div>
              
              <div className="space-y-10">
                {recentAds.length > 0 ? recentAds.map(ad => (
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
                      <span className="bg-slate-50 px-2 py-1 rounded-md">{ad.target_segment === 'single' ? '単身' : ad.target_segment === 'family' ? 'ファミリー' : '全域'}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs font-bold text-slate-300 text-center py-10 tracking-widest uppercase italic">No History Yet</p>
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
      </div>
    </div>
  );
}