'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ShopAnalyticsPage() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);

  // エクスポート処理のシミュレーション
  const handleExport = (type: 'CSV' | 'PDF') => {
    setIsExporting(true);
    setTimeout(() => {
      alert(`${type}形式でレポートを書き出しました。`);
      setIsExporting(false);
    }, 1000);
  };

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

        {/* 1. 主要KPIメトリクス */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'チラシ総閲覧数', value: '3,842', unit: 'views', color: 'text-slate-900' },
            { label: 'クーポン獲得数', value: '156', unit: '件', color: 'text-blue-600' },
            { label: '来店転換率', value: '4.1', unit: '%', color: 'text-emerald-500' },
            { label: '平均滞在時間', value: '48', unit: '秒', color: 'text-orange-500' }
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
          
          {/* 2. 時間帯別エンゲージメント推移 */}
          <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                閲覧推移 (過去24時間)
              </h3>
              <select className="bg-slate-50 border-none text-[10px] font-black rounded-lg px-3 py-1 outline-none">
                <option>今日</option>
                <option>過去7日間</option>
              </select>
            </div>
            
            <div className="flex-1 flex items-end gap-3 px-2 min-h-[250px]">
              {[20, 35, 15, 10, 8, 45, 80, 95, 70, 55, 65, 85, 100, 90, 75, 60, 50, 40, 65, 85, 95, 70, 40, 30].map((h, i) => (
                <div key={i} className="flex-1 bg-blue-50 rounded-t-lg relative group cursor-pointer" style={{ height: `${h}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {i}時: {h}回
                  </div>
                  <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all h-0 group-hover:h-full opacity-30"></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6 text-[8px] font-black text-slate-400 uppercase tracking-widest italic px-2">
              <span>00:00</span><span>08:00</span><span>16:00</span><span>23:59</span>
            </div>
          </div>

          {/* 3. ユーザー属性内訳 */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-10 relative z-10">
                ターゲット属性の反応率
              </h3>
              <div className="space-y-8 relative z-10">
                {[
                  { label: 'ファミリー層', val: 62, color: 'bg-blue-500' },
                  { label: '単身者', val: 24, color: 'bg-indigo-400' },
                  { label: '主婦・主夫', val: 48, color: 'bg-emerald-400' },
                  { label: '学生', val: 12, color: 'bg-orange-400' },
                ].map((d, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                      <span>{d.label}</span>
                      <span>{d.val}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={d.color + " h-full"} style={{ width: `${d.val}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-10 relative z-10">
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">
                * ファミリー層へのプッシュ通知が最も高い反応を得ています。午前の配信を推奨します。
              </p>
            </div>
            <div className="absolute -right-10 -bottom-10 text-[12rem] font-black italic opacity-5 select-none uppercase tracking-tighter">DATA</div>
          </div>

        </div>

        {/* 4. 物件別詳細パフォーマンス一覧 */}
        <div className="mt-8 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm overflow-hidden">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
            物件別・配信パフォーマンス
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">配信先マンション名</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">閲覧数</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">クーポン獲得</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">前月比</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold text-slate-700">
                {[
                  { name: 'スカイハイツ立川', view: 1240, coupon: 42, growth: '+12.5%' },
                  { name: 'パークレジデンス新宿', view: 980, coupon: 31, growth: '+8.2%' },
                  { name: 'メゾン・ド・フルール昭島', view: 620, coupon: 18, growth: '-2.4%' },
                  { name: 'リバーサイドテラス府中', view: 1002, coupon: 65, growth: '+24.1%' },
                ].map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-5 italic">{item.name}</td>
                    <td className="py-5 text-center font-black">{item.view.toLocaleString()}</td>
                    <td className="py-5 text-center text-blue-600 font-black">{item.coupon}</td>
                    <td className={`py-5 text-right font-black ${item.growth.startsWith('+') ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {item.growth}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-12 text-[9px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
          Posutto Store Intelligence System - v2.9.4
        </footer>

      </div>
    </div>
  );
}