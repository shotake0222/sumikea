'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';

export default function AdminPropertiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      // --- セキュリティガード開始 ---
      const { data: { user } } = await supabase.auth.getUser();
      
      // ログインしていない、または Role が ADMIN でない場合はログインへ
      if (!user || user.user_metadata?.role !== 'ADMIN') {
        router.push('/login?type=admin');
        return;
      }
      // --- セキュリティガード終了 ---

      // 権限がある場合のみデータを取得
      const { data } = await supabase.from('properties').select('*');
      if (data) setProperties(data);
      setLoading(false);
    };

    checkAuthAndFetch();
  }, [router]);

  if (loading) return <div className="p-8 text-center">権限確認中...</div>;

  return (
    <AdminLayout userType="ADMIN">
      <div className="p-8">
        <h1 className="text-2xl font-black mb-6">🏢 物件管理（運営専用）</h1>
        {/* 物件一覧などのコンテンツ */}
        <div className="grid gap-4">
          {properties.map(p => (
            <div key={p.uuid} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              {p.name}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}