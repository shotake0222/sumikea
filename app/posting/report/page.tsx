'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

// 型定義を拡張：広告IDごとの詳細を持てるように
interface ReportData {
  adId: string;
  adTitle: string;
  propertyName: string;
  distributedCount: number;
  views: number;
  clicks: number;
  actionRate: number;
  avgDuration: number;
}

export default function PostingReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [summary, setSummary] = useState({
    avgDuration: '0秒',
    totalViews: '0',
    avgCtr: '0%',
    bounceRate: '集計中' // 🎯 修正: ダミー値(18.4%)を削除し、実データ算出までのプレースホルダーに
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // ✅ 広告統計、物件名、広告タイトルの3つを結合して取得
      // digital_flyers(広告主データ) と properties(配信先) をリレーションで引く
      const { data, error } = await supabase
        .from('local_ad_stats')
        .select(`
          ad_id,
          views_count,
          clicks_count,
          total_view_duration,
          properties ( name ),
          digital_flyers ( title )
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
            adId: item.ad_id,
            adTitle: item.digital_flyers?.title || '未設定の広告',
            propertyName: item.properties?.name || '不明な物件',
            distributedCount: Math.floor(views * 1.5), // 推定配布数（閲覧の1.5倍で仮算出）
            views: views,
            clicks: clicks,
            actionRate: views > 0 ? parseFloat(((clicks / views) * 100).toFixed(1)) : 0,
            avgDuration: views > 0 ? Math.floor(duration / views) : 0
          };
        });

        setReports(formatted);

        // 概要統計の計算
        const avgDurTotal = totalV > 0 ? Math.floor(totalD / totalV) : 0;
        setSummary({
          avgDuration: `${Math.floor(avgDurTotal / 60)}分 ${avgDurTotal % 60}秒`,
          totalViews: totalV.toLocaleString(),
          avgCtr: totalV > 0 ? ((totalC / totalV) * 100).toFixed(1) + '%' : '0%',
          bounceRate: '集計中' // 将来的にログ解析実装後に計算式を入れる
        });
      }
    } catch (err) {
      console.error('レポート取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  // CSVダウンロード機能
  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = ["広告ID", "キャンペーン名", "対象マンション", "総閲覧数", "クリック数", "アクション率(%)", "平均滞在(秒)"];
      
      const csvRows = reports.map(report => {
        const title = `"${report.adTitle.replace(/"/g, '""')}"`; 
        const propertyName = `"${report.propertyName.replace(/"/g, '""')}"`;
        
        return [
          report.adId, 
          title, 
          propertyName, 
          report.views, 
          report.clicks, 
          report.actionRate, 
          report.avgDuration
        ].join(',');
      });

      const csvContent = [headers.join(','), ...csvRows].join('\n');
      
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `posting_analysis_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("CSVエクスポート中にエラーが発生しました。");
    } finally {
      setIsExporting(false);
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
            <button 
              onClick={exportToCSV}
              disabled={isExporting || reports.length === 0}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition shadow-lg disabled:opacity-50"
            >
              {isExporting ? '出力中...' : 'CSV ダウンロード'}
            </button>
          </div>
        </header>

        {/* 統計概要カード */}
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

        {/* メインセクション：時系列グラフとセグメント（本番用にプレースホルダー化） */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm min-h-[400px] flex flex-col relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[100px] opacity-50 -mr-20 -mt-20"></div>
            
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center gap-2 relative z-10">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
              エンゲージメント・タイムライン (直近13日間)
            </h3>
            
            {/* 🎯 修正: ハードコードされたダミーグラフを削除し、本番用の「データ蓄積中」表示に変更 */}
            <div className="flex-1 flex items-center justify-center relative z-10 border-2 border-dashed border-slate-100 rounded-3xl">
               <div className="text-center">
                 <span className="text-3xl opacity-20 block mb-2">📊</span>
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">詳細な時系列データは現在蓄積中です</p>
               </div>
            </div>
          </div>

          {/* セグメント反応 */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col">
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6 relative z-10 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-400 rounded-full"></span>
              居住者層別の反応
            </h3>
            
            {/* 🎯 修正: ダミーのパーセンテージを削除 */}
            <div className="flex-1 flex items-center justify-center relative z-10">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-700 p-4 rounded-xl">十分なデータが集まると表示されます</p>
            </div>

            <div className="mt-6 pt-8 border-t border-white/5 relative z-10">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">AI 分析インサイト</p>
              {/* 🎯 修正: ダミーのテキストを削除 */}
              <p className="text-[11px] leading-relaxed text-slate-400">
                現在、分析エンジンが配信データを学習中です。インサイトの生成までしばらくお待ちください。
              </p>
            </div>
          </div>
        </div>

        {/* ✅ 詳細テーブル：実データでレンダリング */}
        <div className="mt-8 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm overflow-hidden">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">広告キャンペーン別詳細分析</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">広告キャンペーン名</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">対象マンション</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">総閲覧数</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">平均滞在</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">アクション率</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold text-slate-700">
                {reports.map((report, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                    <td className="py-6 min-w-[200px]">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-black italic">{report.adTitle}</span>
                        <span className="text-[9px] text-slate-300 uppercase tracking-tighter mt-1">ID: {report.adId.slice(0,8)}...</span>
                      </div>
                    </td>
                    <td className="py-6 text-slate-500 min-w-[150px]">{report.propertyName}</td>
                    <td className="py-6 text-center text-indigo-600 font-black">{report.views.toLocaleString()}</td>
                    <td className="py-6 text-center text-slate-400">{report.avgDuration}秒</td>
                    <td className="py-6 text-right text-green-500 font-black">{report.actionRate}%</td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-300 uppercase text-xs font-black tracking-widest">
                      アクティブな広告データはありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-12 mb-10 text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
          Posutto Analytics Module - Data Science v3.0
        </footer>

      </div>
    </div>
  );
}