'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { useRouter } from 'next/navigation';

type ViewTab = 'posting' | 'manager' | 'shop';

export default function AdminPropertiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ViewTab>('posting');
  
  // モーダル制御
  const [isModalOpen, setIsModalOpen] = useState(false);
  // ✅ join_code を保持するための state を追加
  const [newItem, setNewItem] = useState({ name: '', address: '', extra: '', join_code: '' });

  // データ用ステート
  const [dataList, setDataList] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalResidents: 0,
    activeNotices: 0,
    totalAds: 0,
    totalShops: 0
  });

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login?type=admin');
          return;
        }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        const role = profile?.role || 'USER';
        setUserRole(role);

        if (role !== 'ADMIN' && role !== 'MANAGER') {
          router.push('/login?type=admin');
          return;
        }

        fetchTabData('posting');

        const { count: resCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'USER');
        const { count: noticeCount } = await supabase.from('property_notifications').select('*', { count: 'exact', head: true });
        const { count: shopCount } = await supabase.from('stores').select('*', { count: 'exact', head: true });
        const { count: adsCount } = await supabase.from('local_ads').select('*', { count: 'exact', head: true });

        setStats({
          totalResidents: resCount || 0,
          activeNotices: noticeCount || 0,
          totalAds: adsCount || 0,
          totalShops: shopCount || 0
        });

      } catch (err) {
        console.error('取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetch();
  }, [router]);

  const fetchTabData = async (tab: ViewTab) => {
    let result: any;
    if (tab === 'posting') {
      result = await supabase.from('posting_companies').select('*');
    } else if (tab === 'manager') {
      result = await supabase.from('management_companies').select('*');
    } else {
      result = await supabase.from('stores').select('*');
    }

    const formatted = (result.data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      address: d.address || d.base_location || '未設定',
      category: d.category || (tab === 'posting' ? 'POSTING' : 'MANAGER'),
      // ✅ 招待コードをリスト表示用に含める
      join_code: d.join_code || null
    }));
    setDataList(formatted);
  };

  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
    fetchTabData(tab);
  };

  // ✅ 新規登録処理
  const handleCreate = async () => {
    if (!newItem.name) return alert('名称を入力してください');
    
    let table = '';
    let payload: any = { name: newItem.name };

    if (activeTab === 'posting') {
      table = 'posting_companies';
      payload.base_location = newItem.address;
    } else if (activeTab === 'manager') {
      table = 'management_companies';
      payload.address = newItem.address;
      // ✅ 管理会社の場合：入力があればそれを、なければランダム5桁を生成して保存
      payload.join_code = newItem.join_code || Math.random().toString(36).substring(2, 7).toUpperCase();
    } else {
      table = 'stores';
      payload.address = newItem.address;
      payload.category = newItem.extra || '店舗';
    }

    const { error } = await supabase.from(table).insert([payload]);

    if (error) {
      alert('エラーが発生しました: ' + error.message);
    } else {
      alert('登録が完了しました');
      setIsModalOpen(false);
      setNewItem({ name: '', address: '', extra: '', join_code: '' });
      fetchTabData(activeTab);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <AdminLayout userType={userRole === 'ADMIN' ? 'ADMIN' : 'MANAGER'}>
      <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen">
        
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-8 bg-slate-900 rounded-full" />
              <h1 className="text-4xl font-black italic uppercase text-slate-900">
                ぽすっと <span className="text-blue-600">管理パネル</span>
              </h1>
            </div>
            <p className="text-slate-400 text-[10px] font-bold tracking-[0.3em] ml-5 uppercase">Posutto System Admin Portfolio</p>
          </div>
          
          <div className="flex gap-2">
             <button onClick={() => router.push('/management/post-ad')} className="bg-slate-900 text-white px-6 py-4 rounded-2xl hover:bg-blue-600 transition shadow-xl text-[10px] font-black uppercase tracking-widest">
               🎯 広告を配信する
             </button>
             <button onClick={() => router.push('/management/reporting')} className="bg-white border-2 border-slate-900 text-slate-900 px-6 py-4 rounded-2xl hover:bg-slate-50 transition shadow-md text-[10px] font-black uppercase tracking-widest">
               📈 レポーティング
             </button>
          </div>
        </header>

        {/* 統計セクション */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: '登録住民総数', value: stats.totalResidents, unit: '名', color: 'text-blue-600', path: '/management/reporting?target=resident' },
            { label: '提携店舗・業者', value: stats.totalShops, unit: '件', color: 'text-orange-500', path: '/management/reporting?target=shop' },
            { label: '配信済み広告', value: stats.totalAds, unit: '本', color: 'text-purple-600', path: '/management/reporting?target=posting' },
            { label: '稼働掲示板', value: stats.activeNotices, unit: '箇所', color: 'text-emerald-600', path: '/management/notices' }
          ].map((item, i) => (
            <div key={i} onClick={() => router.push(item.path)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 cursor-pointer hover:scale-[1.02] transition-all">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-black tracking-tighter ${item.color}`}>{item.value.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-300">{item.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* タブと新規登録ボタン */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex bg-slate-100 p-1.5 rounded-3xl gap-1">
            {(['posting', 'manager', 'shop'] as ViewTab[]).map((t) => (
              <button 
                key={t}
                onClick={() => handleTabChange(t)}
                className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all ${activeTab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
              >
                {t === 'posting' ? 'ポスティング会社' : t === 'manager' ? '管理会社' : '店舗'}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition shadow-lg shadow-blue-900/10"
          >
            + {activeTab === 'posting' ? '会社' : activeTab === 'manager' ? '管理会社' : '店舗'}を登録
          </button>
        </div>

        {/* リスト表示セクション */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dataList.map(item => (
            <div key={item.id} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 group hover:border-blue-200 transition-all flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{item.category}</p>
                {/* ✅ 招待コードがあれば表示 */}
                {item.join_code && (
                  <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                    CODE: {item.join_code}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-black text-slate-900 italic mb-4 group-hover:text-blue-600 transition-colors tracking-tighter">{item.name}</h3>
              <p className="text-[11px] text-slate-400 font-bold mb-6 italic">📍 {item.address}</p>
              <div className="flex gap-2 mt-auto">
                <button className="flex-1 bg-slate-50 text-slate-400 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition">詳細</button>
                <button className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition shadow-md">実績分析</button>
              </div>
            </div>
          ))}
          
          {dataList.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <p className="font-black text-slate-300 uppercase tracking-widest text-xs">登録データがありません</p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ 新規登録モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl">
            <h2 className="text-2xl font-black italic mb-6 uppercase tracking-tighter">新規登録: {activeTab === 'manager' ? '管理会社' : activeTab.toUpperCase()}</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Name</label>
                <input 
                  className="w-full p-5 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 font-bold"
                  placeholder="会社名・店舗名"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                />
              </div>

              {/* ✅ 管理会社の場合のみ招待コード入力欄を表示 */}
              {activeTab === 'manager' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-500 ml-2 uppercase">Invitation Code (Optional)</label>
                  <input 
                    className="w-full p-5 bg-blue-50/50 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 font-bold text-blue-600 placeholder:text-blue-300"
                    placeholder="例: MNGR01 (未入力で自動生成)"
                    value={newItem.join_code}
                    onChange={(e) => setNewItem({...newItem, join_code: e.target.value})}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Location / Address</label>
                <input 
                  className="w-full p-5 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 font-bold"
                  placeholder="住所または拠点所在地"
                  value={newItem.address}
                  onChange={(e) => setNewItem({...newItem, address: e.target.value})}
                />
              </div>

              {activeTab === 'shop' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Category</label>
                  <input 
                    className="w-full p-5 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 font-bold"
                    placeholder="例: 飲食店、クリーニング、ジム等"
                    value={newItem.extra}
                    onChange={(e) => setNewItem({...newItem, extra: e.target.value})}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 py-4 font-black text-slate-400 text-xs uppercase tracking-widest hover:text-slate-600"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate} 
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
              >
                Confirm Register
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}