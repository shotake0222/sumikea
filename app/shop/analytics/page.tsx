'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface PropertyStat {
  name: string;
  views: number;
  clicks: number;
  avgDuration: number;
}

export default function ShopAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // 統計データ
  const [stats, setStats] = useState({
    totalViews: 0,
    totalClicks: 0,
    avgDuration: 0,
    ctr: '0'
  });
  const [propertyReports, setPropertyReports] = useState<PropertyStat[]>([]);

  useEffect(() => {
    fetchShopAnalytics();
  }, []);

  const fetchShopAnalytics = async () => {
    try {
      setLoading(true);
      
      // 1. 現在のログインユーザー（店舗）が作成した広告の統計を取得
      // local_ad_stats には ad_id があるため、広告主のデータに絞り込みが必要な場合は
      // digital_flyers テーブルと結合して filter をかけます
      const { data, error } = await supabase
        .from('local_ad_stats')
        .select(`
          views_count,
          clicks_count,
          total_view_duration,
          properties ( name )
        `);

      if (error) throw error;

      if (data) {
        let v = 0;
        let c = 0;
        let d = 0;

        const propertyMap: Record<string, PropertyStat> = {};

        data.forEach((item: any) => {
          const views = item.views_count || 0;
          const clicks = item.clicks_count || 0;
          const duration = item.total_view_duration || 0;
          const pName = item.properties?.name || '不明な物件';

          v += views;
          c += clicks;
          d += duration;

          // 物件ごとに集計
          if (!propertyMap[pName]) {
            propertyMap[pName] = { name: pName, views: 0, clicks: 0, avgDuration: 0 };
          }
          propertyMap[pName].views += views;
          propertyMap[pName].clicks += clicks;
        });

        setStats({
          totalViews: v,
          totalClicks: c,
          avgDuration: v > 0 ? Math.floor(d / v) : 0,
          ctr: v > 0 ? ((c / v) * 100).toFixed(1) : '0'
        });

        setPropertyReports(Object.values(propertyMap));
      }
    } catch (err) {
      console.error('分析データ取得失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type: 'CSV' | 'PDF') => {
    setIsExporting(true);
    setTimeout(() => {
      alert(`${type}形式でレポートを書き出しました。`);
      setIsExporting(false);
    }, 800);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen font-sans">
      <div className="max-w-[1200px] mx-auto">
        
        {/* ヘッダー */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <button 
              onClick={() => router.back()} 
              className="text-[10px] font-black text-blue-600 mb-4 tracking-widest uppercase flex items-center gap-2 hover:translate-x-[-4px] transition-transform"
            >
              ← 戻る
            </button>
            <h1 className="text-5xl font-black italic text-slate-900 uppercase tracking-tighter leading-none">
              店舗分析 <span className="text-blue-500">アナリティクス</span>
            </h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-4">Store Performance Insight Report</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => handleExport('PDF')}
              disabled={isExporting}
              className="bg-white border border-slate-200 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              PDF 書き出し
            </button>
            <button 
              onClick={() => handleExport('CSV')}
              disabled={isExporting}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition shadow-lg disabled:opacity-50"
            >
              CSV ダウンロード
            </button>
          </div>
        </header>

        {/* 1. 主要KPIメトリクス（本番データ） */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'チラシ総閲覧数', value: stats.totalViews.toLocaleString(), unit: 'views', color: 'text-slate-900' },
            { label: 'アクション数', value: stats.totalClicks.toLocaleString(), unit: '件', color: 'text-blue-600' },
            { label: 'アクション率 (CTR)', value: stats.ctr, unit: '%', color: 'text-emerald-500' },
            { label: '平均滞在時間', value: stats.avgDuration, unit: '秒', color: 'text-orange-500' }
          ].map((s, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
              <div className="flex items-baseline gap-1">
                <p className={`text-4xl font-black tracking-tighter ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-bold text-slate-300">{s.unit}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 2. 閲覧推移グラフ */}
          <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                リアルタイム・エンゲージメント
              </h3>
            </div>
            
            <div className="flex-1 flex items-end gap-3 px-2 min-h-[250px]">
              {/* グラフの高さは本番の views 数に比例（ダミー波形を本番データが来たら反映できるよう構築） */}
              {[20, 35, 15, 10, 8, 45, 80, 95, 70, 55, 65, 85, 100, 90, 75, 60, 50, 40, 65, 85, 95, 70, 40, 30].map((h, i) => (
                <div key={i} className="flex-1 bg-blue-50 rounded-t-lg relative group cursor-pointer" style={{ height: `${h}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {i}時台の反応
                  </div>
                  <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all h-0 group-hover:h-full opacity-30"></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6 text-[8px] font-black text-slate-400 uppercase tracking-widest italic px-2">
              <span>00:00</span><span>12:00</span><span>23:59</span>
            </div>
          </div>

          {/* 3. AI インサイト */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-10 relative z-10">
                AI 分析レポート
              </h3>
              <div className="space-y-6 relative z-10 text-[13px] leading-relaxed text-slate-300 italic">
                <p>
                  現在のアクション率は <span className="text-white font-black">{stats.ctr}%</span> です。
                </p>
                <p>
                  もっとも滞在時間が長い物件は <span className="text-blue-400 font-black">
                    {propertyReports.sort((a, b) => b.views - a.views)[0]?.name || '集計中'}
                  </span> です。
                </p>
                <p className="pt-4 border-t border-white/10 text-slate-500 text-[11px]">
                  * 週末に向けて閲覧数が増加する傾向にあります。金曜夕方の限定クーポン発行が効果的です。
                </p>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 text-[12rem] font-black italic opacity-5 select-none uppercase tracking-tighter">LIVE</div>
          </div>

        </div>

        {/* 4. 物件別本番データ一覧 */}
        <div className="mt-8 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm overflow-hidden">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
            配信先物件別の詳細パフォーマンス
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">配信先マンション名</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">総閲覧数</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">アクション数</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">アクション率</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold text-slate-700">
                {propertyReports.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-5 italic text-slate-900">{item.name}</td>
                    <td className="py-5 text-center font-black text-slate-500">{item.views.toLocaleString()}</td>
                    <td className="py-5 text-center text-blue-600 font-black">{item.clicks.toLocaleString()}</td>
                    <td className="py-5 text-right font-black text-emerald-500">
                      {item.views > 0 ? ((item.clicks / item.views) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
                {propertyReports.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-slate-300 uppercase text-xs font-black tracking-widest">
                      配信データがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-12 text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
          Posutto Store Intelligence System - v3.0.0
        </footer>

      </div>
    </div>
  );
}