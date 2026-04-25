'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { useRouter } from 'next/navigation';

export default function AdminPropertiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  
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

        const { data: props } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
        if (props) setProperties(props);

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

        {/* 物件一覧 */}
        <div className="flex justify-between items-center mb-8 px-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight italic">登録物件・エリア管理</h2>
          <button onClick={() => router.push('/properties/new')} className="bg-white border-2 border-slate-900 text-slate-900 px-6 py-3 rounded-xl font-black hover:bg-slate-900 hover:text-white transition-all text-[10px] uppercase tracking-widest">
            + 物件追加
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map(p => (
            <div key={p.id} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col group">
              <div className="p-8 flex-1">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2">{p.join_code || 'No Code'}</p>
                <h3 className="text-2xl font-black text-slate-900 italic tracking-tighter mb-4 group-hover:text-blue-600 transition">{p.name}</h3>
                <p className="text-[11px] text-slate-400 font-bold mb-6">📍 {p.address}</p>
                
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/management/post-ad?property_id=${p.id}`)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest">広告配信</button>
                  <button onClick={() => router.push(`/properties/edit/${p.id}`)} className="flex-1 bg-slate-50 text-slate-400 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest">編集</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}