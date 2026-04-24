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
  
  // ダッシュボード統計用
  const [stats, setStats] = useState({
    totalResidents: 0,
    activeNotices: 0,
    arViews: 0
  });

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // プロフィールから正確なRoleを取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();
        
      const role = profile?.role || user?.user_metadata?.role || 'USER';
      setUserRole(role);

      if (!user || (role !== 'ADMIN' && role !== 'MANAGER')) {
        router.push('/login?type=admin');
        return;
      }

      // 1. 物件一覧取得
      const { data: props } = await supabase.from('properties').select('*');
      if (props) setProperties(props);

      // 2. 統計データの擬似取得（実際にはcount等で集計）
      setStats({
        totalResidents: 1240,
        activeNotices: 42,
        arViews: 8560
      });

      setLoading(false);
    };
    checkAuthAndFetch();
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <AdminLayout userType={userRole === 'ADMIN' ? 'ADMIN' : 'MANAGER'}>
      <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen">
        
        {/* --- 1. ANALYSIS REPORT SECTION (DASHBOARD) --- */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-slate-900 rounded-full" />
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Analytics Dashboard</h1>
          </div>
          <p className="text-slate-400 text-[10px] font-bold tracking-[0.3em] ml-5">POSUTTO SYSTEM OPERATIONAL REPORT</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* 統計カード */}
          {[
            { label: 'Total Residents', value: stats.totalResidents, unit: '人', color: 'text-blue-600' },
            { label: 'Active Notices', value: stats.activeNotices, unit: '件', color: 'text-orange-500' },
            { label: 'AR Engagement', value: stats.arViews, unit: 'views', color: 'text-purple-600' }
          ].map((item, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-black tracking-tighter ${item.color}`}>{item.value.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-300">{item.unit}</span>
              </div>
              {/* 簡易グラフ背景（装飾） */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-50 group-hover:h-20 transition-all opacity-10 flex items-end gap-1 px-4">
                 {[...Array(10)].map((_, j) => (
                   <div key={j} className={`flex-1 ${item.color.replace('text', 'bg')}`} style={{ height: `${Math.random() * 100}%` }} />
                 ))}
              </div>
            </div>
          ))}
        </div>

        {/* --- 2. PROPERTY MANAGEMENT SECTION --- */}
        <div className="flex justify-between items-center mb-8 px-2">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">登録物件一覧</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Property Assets Inventory</p>
          </div>
          <button 
            onClick={() => router.push('/properties/new')}
            className="bg-slate-900 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            + Register New Property
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.length > 0 ? (
            properties.map(p => (
              <div 
                key={p.id} 
                className="group bg-white rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-slate-200 transition-all overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-slate-50 text-slate-400 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                      Code: {p.join_code || 'N/A'}
                    </div>
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition tracking-tighter">
                    {p.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mb-8 uppercase tracking-tight">{p.address || 'Address not registered'}</p>
                  
                  {/* アクションボタン */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button 
                      onClick={() => router.push(`/management/notices?property=${p.id}`)}
                      className="bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-900 py-3 rounded-xl text-[10px] font-black transition-all uppercase"
                    >
                      掲示板管理
                    </button>
                    <button 
                      onClick={() => router.push(`/properties/edit/${p.id}`)}
                      className="bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-900 py-3 rounded-xl text-[10px] font-black transition-all uppercase"
                    >
                      物件編集
                    </button>
                  </div>
                </div>
                
                {/* 詳細リンク（全体クリック代わり） */}
                <button 
                  onClick={() => router.push(`/properties/${p.id}`)}
                  className="w-full bg-slate-50 group-hover:bg-blue-600 py-4 text-slate-400 group-hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  View Full Details →
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-50">
              <div className="text-4xl mb-4 opacity-20">🏗️</div>
              <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No Properties Registered yet.</p>
            </div>
          )}
        </div>

        {/* FOOTER STATS (分析レポートの続きを想定) */}
        <div className="mt-20 bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-2">Monthly Growth Rate</h4>
            <p className="text-5xl font-black italic tracking-tighter">+24.8%</p>
          </div>
          <div className="relative z-10 flex gap-4">
            <button className="bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-3 rounded-xl text-[10px] font-black transition-all">CSV DOWNLOAD</button>
            <button className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl text-[10px] font-black transition-all">SHARE REPORT</button>
          </div>
          <div className="absolute -right-20 -bottom-20 text-[15rem] font-black italic opacity-5 select-none">DATA</div>
        </div>

      </div>
    </AdminLayout>
  );
}