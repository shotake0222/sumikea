'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      // 物件数、広告数、総閲覧数を一括で集計（実際にはRPCや複数クエリで取得）
      const { data: props } = await supabase.from('properties').select('count');
      const { data: ads } = await supabase.from('local_ads').select('count');
      // ... 他の集計ロジック ...
      setSummary({ propCount: props?.length, adCount: ads?.length });
    };
    fetchAdminData();
  }, []);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-black mb-8 italic">PLATFORM ADMIN</h1>
      
      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-3xl shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">管理物件数</p>
          <p className="text-4xl font-black">{summary?.propCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">稼働中の広告</p>
          <p className="text-4xl font-black text-blue-600">{summary?.adCount || 0}</p>
        </div>
        {/* 他のKPI */}
      </div>

      {/* 物件別の稼働状況リスト */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500">物件名</th>
              <th className="p-4 text-xs font-bold text-gray-500">住民用URL</th>
              <th className="p-4 text-xs font-bold text-gray-500">ステータス</th>
            </tr>
          </thead>
          {/* 物件データをmapで回す */}
        </table>
      </div>
    </div>
  );
}