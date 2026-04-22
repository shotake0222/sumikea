'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({ totalAds: 0, totalViews: 0, totalProperties: 0 });
  const [propertyList, setPropertyList] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      // 全物件数
      const { count: pCount } = await supabase.from('properties').select('*', { count: 'exact', head: true });
      // 全広告数
      const { count: aCount } = await supabase.from('local_ads').select('*', { count: 'exact', head: true });
      // 総閲覧数（集計）
      const { data: ads } = await supabase.from('local_ads').select('view_count');
      const totalViews = ads?.reduce((sum, ad) => sum + (ad.view_count || 0), 0) || 0;

      setStats({ totalAds: aCount || 0, totalViews, totalProperties: pCount || 0 });

      // 物件ごとのアクティビティ取得
      const { data: props } = await supabase.from('properties').select('name, uuid');
      setPropertyList(props || []);
    };
    fetchStats();
  }, []);

  return (
    <AdminLayout userType="ADMIN">
      <div className="space-y-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter">System Overview</h1>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Views</p>
            <p className="text-4xl font-black text-blue-600 tracking-tighter">{stats.totalViews.toLocaleString()}</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Ads</p>
            <p className="text-4xl font-black text-slate-800 tracking-tighter">{stats.totalAds}</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Managed Properties</p>
            <p className="text-4xl font-black text-slate-800 tracking-tighter">{stats.totalProperties}</p>
          </div>
        </div>

        {/* 物件リスト・稼働状況 */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 mb-6">稼働中の物件</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Name</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {propertyList.map((p) => (
                  <tr key={p.uuid} className="group">
                    <td className="py-4 text-sm font-bold text-slate-700">{p.name}</td>
                    <td className="py-4 text-right">
                      <button className="text-[10px] font-bold bg-slate-100 px-3 py-1 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">詳細ログを表示</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}