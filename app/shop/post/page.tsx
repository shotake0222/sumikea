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
  
  // 店舗入力：一言（ここをローカライズの核にする）
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

        const role = user?.user_metadata?.role?.toUpperCase() || 'USER';
        if (role !== 'ADMIN' && role !== 'SHOP') { router.push('/login?type=shop'); return; }

        let storeQuery = supabase.from('stores').select('*');
        if (role === 'SHOP') storeQuery = storeQuery.eq('owner_id', user.id);
        
        const { data: storeData } = await storeQuery.limit(1).maybeSingle();
        let currentStore = storeData;

        if (!currentStore && role === 'ADMIN') {
          currentStore = { id: 'admin-preview-id', name: '管理者プレビュー店舗', lat: 35.6895, lng: 139.6917 };
        }

        if (currentStore) {
          setMyStore(currentStore);
          setStoreName(currentStore.name);
          fetchHistory(currentStore.id);
        } else {
          router.push('/login?type=shop');
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

  const handleRadiusSearch = async (radius: number) => {
    if (!myStore?.lat || !myStore?.lng) return;
    setRadiusKm(radius);
    const { data: nearby } = await supabase.rpc('get_properties_within_radius', {
      target_lat: myStore.lat,
      target_lng: myStore.lng,
      radius_meters: radius * 1000
    });
    setNearbyProperties(nearby || []);
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

  // 店舗の「一言」からAIがタイトルと本文を膨らませる
  const handleAIGenerate = () => {
    if (!shopMessage) {
      alert('まずは「店舗からの一言」を入力してください。それを元にAIが構成します。');
      return;
    }
    setAiGenerating(true);
    setTimeout(() => {
      setTitle(`【${storeName}】${shopMessage.substring(0, 15)}...`);
      setContent(`${shopMessage}\n\n${radiusKm}km圏内にお住まいの皆様へ、特別なご案内です。スタッフ一同、皆様のご来店を心よりお待ちしております！`);
      setAiGenerating(false);
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myStore || myStore.id === 'admin-preview-id') return alert('プレビュー不可');

    const targetIds = isMultiPost ? nearbyProperties.map(p => p.uuid || p.id) : [selectedPropertyId];
    if (!targetIds[0]) return alert('配信先を選択してください');
    
    setIsSubmitLoading(true);
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
      alert('地域住民へポスティング完了！');
      setTitle(''); setContent(''); setShopMessage(''); setPdfUrl('');
      fetchHistory(myStore.id);
    }
    setIsSubmitLoading(false);
  };

  if (loading) return <div className="p-10 text-center font-black">INITIALIZING PORTAL...</div>;

  return (
    <AdminLayout userType="SHOP">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-50">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic">AD CONSOLE</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Local Targeting System</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 mb-1">STRENGTHEN WITH</p>
                <button onClick={handleAIGenerate} disabled={aiGenerating} className="text-[10px] font-black bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-orange-500 transition shadow-lg">
                  {aiGenerating ? 'THINKING...' : '✨ AI ASSIST'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 店舗の生の声（ローカライズの核） */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-1">Shop Message (What's new?)</label>
                <input 
                  className="w-full bg-orange-50 border-2 border-orange-100 p-5 rounded-[2rem] text-sm font-bold text-orange-900 placeholder:text-orange-200 outline-none focus:ring-2 focus:ring-orange-500" 
                  value={shopMessage} 
                  onChange={(e) => setShopMessage(e.target.value)} 
                  placeholder="例：雨の日なので、パンをお買い上げの方にミニラスクをプレゼント中！"
                />
              </div>

              {/* ターゲット設定 */}
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Delivery Radius</label>
                  <div className="flex gap-2">
                    {[0.5, 1, 2, 5].map(r => (
                      <button key={r} type="button" onClick={() => handleRadiusSearch(r)} 
                        className={`text-xs font-black w-12 h-12 rounded-2xl border-2 transition ${radiusKm === r ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400'}`}>
                        {r === 0.5 ? '.5' : r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Estimated Reach</p>
                  <p className="text-3xl font-black text-slate-900">{nearbyProperties.length}<span className="text-sm ml-1 text-slate-400 italic">Properties</span></p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Name</label>
                  <input className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-900" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                  <input type="date" className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-slate-900" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
                </div>
              </div>

              {/* 最終出力のプレビュー兼調整 */}
              <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 space-y-6 shadow-inner">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Final Ad Title</label>
                  <input className="w-full bg-transparent border-b-2 border-slate-100 p-2 text-xl font-black outline-none focus:border-slate-900 transition" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title generated by AI or Manual" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ad Content Body</label>
                  <textarea className="w-full bg-transparent p-2 text-sm font-bold min-h-[100px] outline-none" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Ad details..." />
                </div>
              </div>

              {/* PDF/画像アップロード */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Flyer Data (Optional)</label>
                <label className="w-full bg-slate-100 border-2 border-dashed border-slate-300 p-6 rounded-3xl cursor-pointer hover:bg-slate-200 transition flex items-center justify-center gap-3">
                  <span className="text-xl">{uploading ? '⌛' : '📎'}</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase">{pdfUrl ? 'File Ready ✅' : 'Click to Upload Flyer'}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf,image/*" />
                </label>
              </div>

              <button disabled={isSubmitLoading} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black shadow-2xl hover:bg-orange-500 transition active:scale-[0.98] text-lg italic tracking-tighter">
                {isSubmitLoading ? 'POSTING...' : 'PUSH TO NEIGHBORHOOD'}
              </button>
            </form>
          </div>
        </div>

        {/* サイドバー：履歴 */}
        <div className="w-full lg:w-96">
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl sticky top-6">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] mb-10 text-slate-500 text-center">Live Statistics</h2>
            <div className="space-y-10">
              {recentAds.map(ad => (
                <div key={ad.id} className="relative pl-6 border-l-2 border-orange-500">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-black truncate w-40 italic">{ad.title}</p>
                    <p className="text-xs font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-lg">{ad.view_count || 0}</p>
                  </div>
                  <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-500">
                    <span>{new Date(ad.created_at).toLocaleDateString()}</span>
                    <span>Radius: {ad.radius_km}km</span>
                  </div>
                </div>
              ))}
              {recentAds.length === 0 && <p className="text-[10px] text-slate-500 text-center font-bold italic">No history yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}