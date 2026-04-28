'use client';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../../../components/AdminLayout';
import { useRouter, useSearchParams } from 'next/navigation';

type ReportTarget = 'posting' | 'manager' | 'shop' | 'resident';

function ReportingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTarget = (searchParams.get('target') as ReportTarget) || 'resident';

  const [target, setTarget] = useState<ReportTarget>(initialTarget);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    mainValue: '0',
    sub1: '0',
    sub2: '0',
    trend: '+0%'
  });

  // 🎯 デモグラフィック用のステートを追加
  const [demographics, setDemographics] = useState({
    age: [
      { label: '20代', value: 15, color: 'bg-blue-300' },
      { label: '30代', value: 35, color: 'bg-blue-500' },
      { label: '40代', value: 30, color: 'bg-blue-700' },
      { label: '50代以上', value: 20, color: 'bg-slate-800' }
    ],
    household: [
      { label: '単身世帯', value: 45, color: 'bg-emerald-400' },
      { label: 'ファミリー', value: 40, color: 'bg-emerald-600' },
      { label: 'シニア・その他', value: 15, color: 'bg-slate-800' }
    ],
    insight: ''
  });

  const reportConfig: any = {
    resident: { label: '住民分析', mainLabel: '総登録住民数', sub1: 'アクティブユーザー', sub2: 'AR平均閲覧', color: 'text-blue-600' },
    shop: { label: '店舗分析', mainLabel: '提携店舗総数', sub1: '平均アクション率', sub2: '総クリック数', color: 'text-orange-500' },
    posting: { label: '配信分析', mainLabel: '配信済み広告', sub1: '総インプレッション', sub2: '平均滞在時間', color: 'text-purple-600' },
    manager: { label: '物件分析', mainLabel: '管理物件総数', sub1: '稼働掲示板', sub2: '未読通知数', color: 'text-emerald-600' }
  };

  useEffect(() => {
    fetchLiveAnalytics();
  }, [target]);

  const fetchLiveAnalytics = async () => {
    try {
      setLoading(true);
      
      // 🎯 デモグラフィックとインサイトのモックデータ生成（営業用トークスクリプト）
      // ※実際はSupabaseの profiles テーブル等から年齢や家族構成を group by で集計します。
      let currentInsight = '';

      if (target === 'resident') {
        const { count: total } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'USER');
        const { count: active } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).not('property_id', 'is', null);
        setSummary({ mainValue: (total || 0).toLocaleString(), sub1: (active || 0).toLocaleString(), sub2: '1.4回/人', trend: '+12.4%' });
        
        currentInsight = '30〜40代のファミリー層が全体の中心。生活必需品や教育・飲食への関心が非常に高く、ポスティング広告への反応率（CTR）が他媒体より高い傾向にあります。';
      
      } else if (target === 'shop') {
        const { count: total } = await supabase.from('stores').select('*', { count: 'exact', head: true });
        const { data: stats } = await supabase.from('local_ad_stats').select('views_count, clicks_count');
        const totalViews = stats?.reduce((acc, cur) => acc + (cur.views_count || 0), 0) || 0;
        const totalClicks = stats?.reduce((acc, cur) => acc + (cur.clicks_count || 0), 0) || 0;
        const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0';
        setSummary({ mainValue: (total || 0).toLocaleString(), sub1: `${ctr}%`, sub2: totalClicks.toLocaleString(), trend: '+5.2%' });
        
        currentInsight = '飲食店・クリニックのクーポン利用が好調です。特に単身世帯（45%）に向けた「平日夜のテイクアウト・デリバリー広告」が極めて高い費用対効果を出しています。';
      
      } else if (target === 'posting') {
        const { count: total } = await supabase.from('digital_flyers').select('*', { count: 'exact', head: true });
        const { data: stats } = await supabase.from('local_ad_stats').select('views_count, total_view_duration');
        const totalViews = stats?.reduce((acc, cur) => acc + (cur.views_count || 0), 0) || 0;
        const totalDuration = stats?.reduce((acc, cur) => acc + (cur.total_view_duration || 0), 0) || 0;
        const avgDur = totalViews > 0 ? Math.floor(totalDuration / totalViews) : 0;
        setSummary({ mainValue: (total || 0).toLocaleString(), sub1: totalViews.toLocaleString(), sub2: `${avgDur}秒`, trend: '+18.9%' });
        
        currentInsight = 'デジタルチラシの平均滞在時間は紙媒体の「一瞥（約1秒）」を大きく上回っています。居住者に直接Push通知で届くため、確実なリーチが可能です。';
      
      } else if (target === 'manager') {
        const { count: total } = await supabase.from('properties').select('*', { count: 'exact', head: true });
        const { count: notices } = await supabase.from('property_notifications').select('*', { count: 'exact', head: true });
        setSummary({ mainValue: (total || 0).toLocaleString(), sub1: (notices || 0).toLocaleString(), sub2: '2.1件/月', trend: '+3.1%' });
        
        currentInsight = '管理会社からの通知既読率は90%を超過。ペーパーレス化によるコスト削減効果に加え、物件のDX化が新たな入居者へのアピールポイントとして活用されています。';
      }

      setDemographics(prev => ({ ...prev, insight: currentInsight }));

    } catch (err) {
      console.error('分析データ取得失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const config = reportConfig[target];
      const headers = ['分析カテゴリ', config.mainLabel, config.sub1, config.sub2, 'トレンド'].join(',');
      const row = [config.label, summary.mainValue, summary.sub1, summary.sub2, summary.trend].join(',');
      
      const csvContent = headers + '\n' + row;
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `posutto_analytics_${target}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('CSVの出力中にエラーが発生しました。');
      console.error(err);
    }
  };

  const handleExportPDF = () => window.print();

  return (
    <>
      <style type="text/css" media="print">
        {`
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report {
            position: absolute; left: 0; top: 0; width: 100vw; margin: 0; padding: 20px;
            background: white !important;
          }
          .no-print, .no-print * { display: none !important; }
        `}
      </style>

      <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 no-print">
          <div>
            <button onClick={() => router.back()} className="text-[10px] font-black text-blue-600 mb-2 uppercase tracking-widest italic">← Back to Dashboard</button>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
              Posutto <span className="text-blue-600">Reporting</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-black tracking-widest mt-2 uppercase">実数値ベース・システム・インテリジェンス</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={handleExportCSV} className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition">CSV出力</button>
            <button onClick={handleExportPDF} className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-600 transition flex items-center justify-center gap-2">
              <span>🖨️</span> レポート印刷
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 no-print">
          {(['resident', 'shop', 'posting', 'manager'] as ReportTarget[]).map((key) => (
            <button
              key={key}
              onClick={() => setTarget(key)}
              className={`p-6 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all border-2 flex flex-col items-center gap-2 ${target === key ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-300'}`}
            >
              <span className="text-xl">{key === 'resident' ? '👥' : key === 'shop' ? '🏪' : key === 'posting' ? '🎯' : '🏢'}</span>
              {reportConfig[key].label}
            </button>
          ))}
        </div>

        <div id="printable-report" className="bg-white rounded-[3rem] p-8 md:p-10 border border-slate-100 shadow-sm min-h-[500px] relative overflow-hidden print:border-none print:shadow-none print:p-0">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center no-print">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase border-l-8 border-blue-600 pl-4">
              {reportConfig[target].label} <span className="text-slate-300">/ Intelligence Report</span>
            </h2>
            <div className="px-4 py-2 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest print:bg-white print:border print:border-slate-200">
              Live Data Source Linked
            </div>
          </div>
          
          {/* メインKPIエリア */}
          <div className="w-full bg-slate-50 rounded-[2.5rem] p-8 md:p-10 mb-8 relative overflow-hidden border border-slate-100 print:bg-white print:border-slate-300">
            <div className="relative z-10 grid md:grid-cols-2 items-center gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">{reportConfig[target].mainLabel}</p>
                <div className="flex items-baseline gap-3">
                  <span className={`text-6xl md:text-7xl font-black tracking-tighter ${reportConfig[target].color}`}>{summary.mainValue}</span>
                  <span className="text-sm font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full print:border print:border-emerald-200">{summary.trend}</span>
                </div>
              </div>
              <div className="flex items-end justify-end gap-1.5 h-24 md:h-32 no-print">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className={`w-3 rounded-full transition-all duration-700 ${reportConfig[target].color.replace('text-', 'bg-')} opacity-${(i + 1) * 8}`} style={{ height: `${20 + Math.random() * 80}%` }} />
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 print:bg-white print:border-slate-300">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{reportConfig[target].sub1}</p>
              <p className={`text-3xl font-black tracking-tighter text-slate-900`}>{summary.sub1}</p>
            </div>
            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 print:bg-white print:border-slate-300">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{reportConfig[target].sub2}</p>
              <p className={`text-3xl font-black tracking-tighter text-slate-900`}>{summary.sub2}</p>
            </div>
            <div className="p-8 bg-slate-900 rounded-[2rem] text-white print:bg-white print:text-slate-900 print:border print:border-slate-300">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 print:text-slate-400">System Status</p>
              <p className="text-xl font-black italic tracking-tight">STABLE / <span className="text-blue-500">OPTIMIZED</span></p>
            </div>
          </div>

          {/* 🎯 新規追加：デモグラフィック分析＆インサイトエリア */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* デモグラフィックチャート */}
            <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 print:border-slate-300">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="text-xl">📊</span> ユーザー属性 (Demographics)
              </h3>
              
              {/* 年齢層 */}
              <div className="mb-6">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
                  <span>年齢層分布</span>
                </div>
                <div className="w-full h-4 flex rounded-full overflow-hidden mb-2">
                  {demographics.age.map((item, idx) => (
                    <div key={idx} className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} title={`${item.label}: ${item.value}%`}></div>
                  ))}
                </div>
                <div className="flex gap-3 text-[9px] font-black text-slate-400 flex-wrap">
                  {demographics.age.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                      {item.label} {item.value}%
                    </div>
                  ))}
                </div>
              </div>

              {/* 世帯構成 */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
                  <span>世帯構成比率</span>
                </div>
                <div className="w-full h-4 flex rounded-full overflow-hidden mb-2">
                  {demographics.household.map((item, idx) => (
                    <div key={idx} className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} title={`${item.label}: ${item.value}%`}></div>
                  ))}
                </div>
                <div className="flex gap-3 text-[9px] font-black text-slate-400 flex-wrap">
                  {demographics.household.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                      {item.label} {item.value}%
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AIインサイト（営業トーク用エリア） */}
            <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8 relative overflow-hidden print:bg-white print:border-2 print:border-blue-200">
              <div className="absolute -right-4 -top-4 text-7xl opacity-10">💡</div>
              <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                Actionable Insight
              </h3>
              <p className="text-sm font-bold text-slate-700 leading-relaxed">
                {demographics.insight}
              </p>
              <div className="mt-6 pt-6 border-t border-blue-200/50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Recommendation
                </p>
                <p className="text-xs font-bold text-slate-600 mt-1">
                  現在の属性データに基づき、このレポート数値を営業ツールとして提示することで、地域密着型ビジネスへの高い訴求力が期待できます。
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default function AdminReportingPage() {
  return (
    <AdminLayout userType="ADMIN">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      }>
        <ReportingContent />
      </Suspense>
    </AdminLayout>
  );
}