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

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.user_metadata?.role;
      setUserRole(role);

      if (!user || (role !== 'ADMIN' && role !== 'MANAGER')) {
        router.push('/login?type=admin');
        return;
      }

      const { data } = await supabase.from('properties').select('*');
      if (data) setProperties(data);
      setLoading(false);
    };
    checkAuthAndFetch();
  }, [router]);

  // 物件詳細へ飛ばす関数
  const handlePropertyClick = (id: string) => {
    router.push(`/properties/${id}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <AdminLayout userType={userRole === 'ADMIN' ? 'ADMIN' : 'MANAGER'}>
      <div className="p-8">
        <header className="flex justify-between items-end mb-8">
          <div>
            <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              {userRole === 'ADMIN' ? 'System Root' : 'Management'}
            </span>
            <h1 className="text-3xl font-black text-slate-800 mt-2 tracking-tighter">
              🏢 物件管理
            </h1>
          </div>
          {/* 新規登録ボタン（機能させる場合は onClick を追加） */}
          <button 
            onClick={() => router.push('/properties/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 transition active:scale-95 text-sm"
          >
            + 新規物件登録
          </button>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.length > 0 ? (
            properties.map(p => (
              <div 
                key={p.id || p.uuid} 
                onClick={() => handlePropertyClick(p.id || p.uuid)} // クリックで詳細へ
                className="group p-6 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/5 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="font-black text-slate-800 leading-tight group-hover:text-blue-600 transition">
                    {p.name}
                  </h2>
                  <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-lg font-bold">稼働中</span>
                </div>
                <p className="text-xs text-slate-400 font-medium mb-6">{p.address || '東京都立川市...'}</p>
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-black text-slate-300 uppercase">Details</span>
                  <div className="w-8 h-8 bg-slate-50 group-hover:bg-blue-600 rounded-full flex items-center justify-center transition">
                    <span className="text-slate-400 group-hover:text-white">→</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <p className="text-slate-400 font-bold">表示できる物件がありません。</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}