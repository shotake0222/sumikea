'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase'; // 階層が深いので ../../../ になります
import AdminLayout from '../../../components/AdminLayout';
import { useRouter, useParams } from 'next/navigation';

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id; // URLの [id] 部分を取得

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const fetchPropertyData = async () => {
      // 1. 権限チェック
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.user_metadata?.role;
      setUserRole(role);

      if (!user || (role !== 'ADMIN' && role !== 'MANAGER')) {
        router.push('/login?type=admin');
        return;
      }

      // 2. 物件データの取得
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id) // または .eq('uuid', id) DBの型に合わせてください
        .single();

      if (error || !data) {
        alert('物件が見つかりませんでした');
        router.push('/properties');
        return;
      }

      setProperty(data);
      setLoading(false);
    };

    if (id) fetchPropertyData();
  }, [id, router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <AdminLayout userType={userRole === 'ADMIN' ? 'ADMIN' : 'MANAGER'}>
      <div className="p-8 max-w-4xl mx-auto">
        {/* ヘッダー・ナビゲーション */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.push('/properties')}
            className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 transition"
          >
            ←
          </button>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter">物件詳細設定</h1>
        </div>

        {/* メインカード */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="space-y-8">
            {/* 物件名 */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Property Name</label>
              <div className="mt-2 p-5 bg-slate-50 rounded-2xl text-lg font-bold text-slate-800">
                {property.name}
              </div>
            </div>

            {/* 住所 */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Address</label>
              <div className="mt-2 p-5 bg-slate-50 rounded-2xl text-sm font-bold text-slate-600">
                {property.address || '未設定'}
              </div>
            </div>

            {/* 位置情報（緯度・経度） */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Latitude (緯度)</label>
                <div className="mt-2 p-4 bg-slate-50 rounded-2xl text-sm font-mono font-bold text-slate-500">
                  {property.location_lat}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Longitude (経度)</label>
                <div className="mt-2 p-4 bg-slate-50 rounded-2xl text-sm font-mono font-bold text-slate-500">
                  {property.location_lng}
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="pt-8 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => alert('編集機能は今後実装します')}
                className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-black transition active:scale-95"
              >
                情報を編集する
              </button>
              <button 
                className="px-8 py-4 rounded-2xl font-black text-red-500 border-2 border-red-50 hover:bg-red-50 transition"
              >
                削除
              </button>
            </div>
          </div>
        </div>

        {/* 補足情報 */}
        <p className="mt-8 text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest">
          Property ID: {property.id || property.uuid}
        </p>
      </div>
    </AdminLayout>
  );
}