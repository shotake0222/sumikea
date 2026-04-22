'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      // 広告ごとに、どの物件で何回閲覧されたかを集計
      const { data } = await supabase
        .from('local_ads')
        .select(`
          id,
          title,
          store_name,
          ad_view_logs(property_id, properties(name))
        `);
      
      if (data) {
        // 物件ごとの内訳を集計するロジック
        const formatted = data.map(ad => {
          const propertyBreakdown: any = {};
          ad.ad_view_logs?.forEach((log: any) => {
            const name = log.properties.name;
            propertyBreakdown[name] = (propertyBreakdown[name] || 0) + 1;
          });
          return { ...ad, breakdown: propertyBreakdown };
        });
        setStats(formatted);
      }
    };
    fetchStats();
  }, []);

  return (
    <AdminLayout userType="ADMIN">
      <div className="space-y-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter">📊 配信パフォーマンス分析</h1>
        
        <div className="grid grid-cols-1 gap-6">
          {stats.map(ad => (
            <div key={ad.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase mb-2 inline-block">
                    {ad.store_name}
                  </span>
                  <h2 className="text-xl font-bold text-slate-800">{ad.title}</h2>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">物件別の閲覧内訳</p>
                {Object.entries(ad.breakdown).map(([name, count]: any) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-600">{name}</span>
                      <span className="font-black text-slate-900">{count} views</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{ width: `${Math.min(count * 10, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}