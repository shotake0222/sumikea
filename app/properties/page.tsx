'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // 2つ上
import AdminLayout from '../../components/AdminLayout'; // 2つ上
import { useRouter } from 'next/navigation';

export default function AdminPropertiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      // --- セキュリティガード開始 ---
      const { data: { user } } = await supabase.auth.getUser();
      
      const role = user?.user_metadata?.role;
      setUserRole(role);

      // ログインしていない、または Role が ADMIN でも MANAGER でもない場合はログインへ
      if (!user || (role !== 'ADMIN' && role !== 'MANAGER')) {
        router.push('/login?type=admin');
        return;
      }
      // --- セキュリティガード終了 ---

      // 権限がある場合のみデータを取得
      // MANAGERの場合は自分が担当する物件のみに絞るロジックが必要な場合はここを拡張しますが、
      // 現状は一律で全物件を取得する設定を維持します。
      const { data } = await supabase.from('properties').select('*');
      if (data) setProperties(data);
      setLoading(false);
    };

    checkAuthAndFetch();
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="ml-3 font-bold text-slate-500">権限確認中...</p>
    </div>
  );

  return (
    <AdminLayout userType={userRole === 'ADMIN' ? 'ADMIN' : 'MANAGER'}>
      <div className="p-8">
        <header className="mb-8">
          <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full uppercase tracking-widest">
            {userRole === 'ADMIN' ? 'System Root' : 'Management'}
          </span>
          <h1 className="text-3xl font-black text-slate-800 mt-2 tracking-tighter">
            🏢 物件管理（{userRole === 'ADMIN' ? '運営専用' : '管理会社用'}）
          </h1>
        </header>

        {/* 物件一覧コンテンツ */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.length > 0 ? (
            properties.map(p => (
              <div key={p.id || p.uuid} className="p-6 bg-white rounded-[2rem] shadow-sm border border-slate-200 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="font-black text-slate-800 leading-tight">{p.name}</h2>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold">ACTIVE</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">{p.address || '住所情報なし'}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full p-12 text-center bg-slate-100 rounded-[2rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">表示できる物件がありません。</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}