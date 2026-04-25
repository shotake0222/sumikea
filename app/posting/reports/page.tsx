'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

// 型定義
interface ReportData {
  propertyName: string;
  distributedCount: number;
  views: number;
  actionRate: number;
  viewDuration: number;
}

export default function PostingReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [summary, setSummary] = useState({
    avgDuration: '0秒',
    totalViews: '0',
    avgCtr: '0%',
    bounceRate: '0%'
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // 物件ごとの統計データを取得（propertiesとad_statsを結合）
      // ※ad_statsテーブルにデータがある前提
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
        let totalV = 0;
        let totalC = 0;
        let totalD = 0;

        const formatted: ReportData[] = data.map((item: any) => {
          const views = item.views_count || 0;
          const clicks = item.clicks_count || 0;
          const duration = item.total_view_duration || 0;
          
          totalV += views;
          totalC += clicks;
          totalD += duration;

          return {
            propertyName: item.properties?.name || '不明な物件',
            distributedCount: Math.floor(views * 1.2), // 仮の配布数（閲覧の1.2倍と設定）
            views: views,
            actionRate: views > 0 ? parseFloat(((clicks / views) * 100).toFixed(1)) : 0,
            viewDuration: views > 0 ? Math.floor(duration / views) : 0
          };
        });

        setReports(formatted);

        // 概要統計の計算
        const avgDur = totalV > 0 ? Math.floor(totalD / totalV) : 0;
        setSummary({
          avgDuration: `${Math.floor(avgDur / 60)}分 ${avgDur % 60}秒`,
          totalViews: totalV.toLocaleString(),
          avgCtr: totalV > 0 ? ((totalC / totalV) * 100).toFixed(1) + '%' : '0%',
          bounceRate: '24%' // ここは将来的に離脱ログから算出
        });
      }
    } catch (err) {
      console.error('レポート取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
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
              className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2 hover:translate-x-[-4px] transition-transform"
            >
              ← ダッシュボードへ戻る
            </button>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
              配布分析 <span className="text-indigo-600">レポート</span>
            </h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-4">Posutto Posting Analysis System</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-white border border-slate-200 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition shadow-sm">PDF 書き出し</button>
            <button className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition shadow-lg">CSV ダウンロード</button>
          </div>
        </header>

        {/* 統計概要カード（動的データ） */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: '平均チラシ閲覧時間', value: summary.avgDuration, color: 'text-slate-900' },
            { label: '閲覧ユーザー総数', value: summary.totalViews, color: 'text-indigo-600' },
            { label: '平均アクション率 (CTR)', value: summary.avgCtr, color: 'text-green-500' },
            { label: '離脱率', value: summary.bounceRate, color: 'text-orange-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* メインセクション：グラフとデモグラ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm min-h-[400px] flex flex-col">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
              エンゲージメント・タイムライン (直近13日間)
            </h3>
            <div className="flex-1 flex items-end gap-2 px-2">
              {/* グラフの高さもデータに連動させたい場合はここを調整 */}
              {[40, 70, 45, 90, 65, 80, 100, 50, 70, 85, 60, 75, 95].map((h, i) => (
                <div key={i} className="flex-1 bg-indigo-50 rounded-t-xl relative group cursor-pointer" style={{ height: `${h}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {h}% 閲覧
                  </div>
                  <div className="absolute bottom-0 w-full bg-indigo-600 rounded-t-xl transition-all h-0 group-hover:h-full opacity-20"></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-10 relative z-10 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-400 rounded-full"></span>
              居住者層別の反応
            </h3>
            <div className="space-y-8 relative z-10">
              {[
                { label: 'ファミリー層', val: 55, color: 'bg-indigo-500' },
                { label: '単身者層', val: 25, color: 'bg-blue-400' },
                { label: 'シニア層', val: 15, color: 'bg-purple-400' },
                { label: '高所得層', val: 5, color: 'bg-emerald-400' },
              ].map((d, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-2 text-slate-400">
                    <span>{d.label}</span>
                    <span className="text-white">{d.val}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className={d.color + " h-full"} style={{ width: `${d.val}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 詳細テーブル：DBからのリアルデータを反映 */}
        <div className="mt-8 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm overflow-hidden">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">マンション別パフォーマンス詳細</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">対象物件名</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">推定配布数</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">総閲覧数</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">アクション率</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold text-slate-700">
                {reports.map((report, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                    <td className="py-6 italic group-hover:text-indigo-600 transition-colors">{report.propertyName}</td>
                    <td className="py-6 text-center text-slate-400">{report.distributedCount}</td>
                    <td className="py-6 text-center text-indigo-600 font-black">{report.views}</td>
                    <td className="py-6 text-right text-green-500 font-black">{report.actionRate}%</td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-slate-300 uppercase text-xs font-black tracking-widest">
                      データがまだ蓄積されていません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-12 mb-10 text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
          Posutto 分析モジュール - レポーティングシステム v2.9
        </footer>

      </div>
    </div>
  );
}