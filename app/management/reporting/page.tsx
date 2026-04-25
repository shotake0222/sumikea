'use client';
import { useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';

export default function AdminReportingPage() {
  const [target, setTarget] = useState<'posting' | 'manager' | 'shop' | 'resident'>('resident');
  const [subItem, setSubItem] = useState('conversion');

  // ダミーデータ（本来はSupabaseから集計）
  const reportConfig: any = {
    resident: { label: '住民分析', items: ['アクティブ率', 'AR閲覧数', '広告反応率'] },
    shop: { label: '店舗分析', items: ['来店転換数', 'クーポン利用', 'リピート率'] },
    posting: { label: 'ポスティング分析', items: ['配布完了率', 'エリア到達度', '単価効率'] },
    manager: { label: '管理会社分析', items: ['掲示板稼働率', 'アンケート回収数', 'コスト削減額'] }
  };

  const handleExportCSV = () => alert('CSVデータを出力します...');
  const handleExportPDF = () => window.print();

  return (
    <AdminLayout userType="ADMIN">
      <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen">
        <header className="mb-10 flex justify-between items-end no-print">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
              Posutto <span className="text-blue-600">Reporting</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-black tracking-widest mt-2 uppercase">データドリブン・マネジメント・コンソール</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExportCSV} className="bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">CSV出力</button>
            <button onClick={handleExportPDF} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200">PDF印刷</button>
          </div>
        </header>

        {/* 大項目選択 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 no-print">
          {Object.entries(reportConfig).map(([key, value]: any) => (
            <button
              key={key}
              onClick={() => setTarget(key as any)}
              className={`p-6 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all border-2 ${target === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-500'}`}
            >
              {value.label}
            </button>
          ))}
        </div>

        {/* メインレポートエリア */}
        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm min-h-[600px]">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black text-slate-900 italic">{reportConfig[target].label} 詳細レポート</h2>
            <select 
              className="bg-slate-50 border-none p-4 rounded-xl font-bold text-xs outline-none"
              value={subItem}
              onChange={(e) => setSubItem(e.target.value)}
            >
              {reportConfig[target].items.map((item: string) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          {/* グラフ代わりのビジュアルシミュレーション */}
          <div className="w-full h-80 bg-slate-50 rounded-[2rem] flex items-end justify-around p-10 gap-2 mb-10 overflow-hidden relative">
            <div className="absolute top-10 left-10">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Current Trend: {subItem}</p>
              <p className="text-4xl font-black text-blue-600">+24.8%</p>
            </div>
            {[60, 40, 90, 70, 50, 80, 100, 45, 95].map((h, i) => (
              <div key={i} className="flex-1 bg-slate-900 rounded-t-xl transition-all duration-1000" style={{ height: `${h}%`, opacity: (i+1)/10 }} />
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-blue-50 rounded-2xl">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Max Reach</p>
              <p className="text-2xl font-black text-blue-600">12,400</p>
            </div>
            <div className="p-6 bg-orange-50 rounded-2xl">
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Avg Engagement</p>
              <p className="text-2xl font-black text-orange-600">8.2%</p>
            </div>
            <div className="p-6 bg-purple-50 rounded-2xl">
              <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1">Total Impact</p>
              <p className="text-2xl font-black text-purple-600">Gold Tier</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}