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
  
  // 各種データ用ステート
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

        // 初期表示データ取得
        fetchTabData('posting');

        // 統計データの取得
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

  // タブ切り替え時にデータを取得し直す
  const fetchTabData = async (tab: ViewTab) => {
    let query: any;
    if (tab === 'posting') {
      // ポスティング会社（例としてprofilesから配布員/会社権限を想定。なければ物件一覧を代替表示）
      query = supabase.from('properties').select('id, name, address, join_code');
    } else if (tab === 'manager') {
      // 管理会社（管理物件リスト）
      query = supabase.from('properties').select('id, name, address, join_code');
    } else {
      // 店舗
      query = supabase.from('stores').select('id, name, address, category');
    }

    const { data } = await query.order('created_at', { ascending: false });
    setDataList(data || []);
  };

  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
    fetchTabData(tab);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <AdminLayout userType={userRole === 'ADMIN' ? 'ADMIN' : 'MANAGER'}>
      <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen">
        
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-8 bg-slate-900 rounded-full" />
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
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

        {/* 登録・管理セクション：タブ切り替え */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] gap-1">
              {[
                { id: 'posting', label: 'ポスティング会社' },
                { id: 'manager', label: '管理会社' },
                { id: 'shop', label: '店舗' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as ViewTab)}
                  className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab.id 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <button onClick={() => router.push(activeTab === 'shop' ? '/management/shops/new' : '/properties/new')} className="bg-white border-2 border-slate-900 text-slate-900 px-6 py-3 rounded-xl font-black hover:bg-slate-900 hover:text-white transition-all text-[10px] uppercase tracking-widest">
              + 新規登録
            </button>
          </div>
        </div>

        {/* リスト表示 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dataList.map(item => (
            <div key={item.id} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:border-blue-200 transition-all">
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">
                    {item.join_code || item.category || 'REGISTED'}
                  </p>
                  <span className="text-[10px] font-bold text-slate-300">#{item.id.slice(0, 5)}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter mb-4 group-hover:text-blue-600 transition">
                  {item.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold mb-6 min-h-[32px]">
                  📍 {item.address || '住所未登録'}
                </p>
                
                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => router.push(activeTab === 'shop' ? `/management/shops/edit/${item.id}` : `/properties/edit/${item.id}`)}
                    className="flex-1 bg-slate-50 text-slate-400 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition"
                  >
                    詳細・編集
                  </button>
                  <button 
                    onClick={() => router.push(`/management/reporting?id=${item.id}`)}
                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition"
                  >
                    実績分析
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {dataList.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <p className="font-black text-slate-300 uppercase tracking-widest text-xs">データが登録されていません</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}