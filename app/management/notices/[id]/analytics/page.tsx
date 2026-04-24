'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../../lib/supabase';
import { useParams } from 'next/navigation';

export default function NoticeAnalyticsPage() {
  const { id } = useParams();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // 1. この物件の総住民数を取得
      const { data: notice } = await supabase
        .from('property_notifications')
        .select('property_id')
        .eq('id', id)
        .single();

      const { count: totalResidents } = await supabase
        if (!notice) return null;
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', notice!.property_id);　

      // 2. 既読者数とデモグラ情報を結合して取得
      const { data: reads } = await supabase
        .from('notice_reads')
        .select('user_id, profiles(household_size, has_pet, primary_transport)')
        .eq('notice_id', id);

      const readCount = reads?.length || 0;
      const readRate = totalResidents ? Math.round((readCount / totalResidents) * 100) : 0;

      // 3. 属性別の既読分析（例：ペット飼育者の既読率）
      const petOwnersRead = reads?.filter(r => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return profile?.has_pet;
    }).length || 0;
      setStats({ totalResidents, readCount, readRate, petOwnersRead });
      setLoading(false);
    };
    fetchAnalytics();
  }, [id]);

  if (loading) return <div className="p-20 text-center font-black">ANALYZING...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto bg-[#F8FAFC] min-h-screen">
      <h1 className="text-2xl font-black mb-8 italic">Notice Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">既読率</p>
          <p className="text-5xl font-black text-blue-600 tracking-tighter">{stats.readRate}%</p>
          <p className="text-xs font-bold text-slate-500 mt-2">{stats.readCount} / {stats.totalResidents} 世帯</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ターゲット既読</p>
          <p className="text-5xl font-black text-orange-500 tracking-tighter">{stats.petOwnersRead}</p>
          <p className="text-xs font-bold text-slate-500 mt-2">ペット飼育世帯の読了数</p>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] mb-6">AI Insight</h2>
        <p className="text-lg font-medium leading-relaxed opacity-90">
          {stats.readRate < 30 
            ? "既読率が低迷しています。通知タイトルに「【全住民対象】」を付加し、プッシュ通知の再送を推奨します。" 
            : "順調に周知が進んでいます。特にターゲット層の反応が良好です。"}
        </p>
      </div>
    </div>
  );
}
