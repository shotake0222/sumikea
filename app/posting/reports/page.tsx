'use client';

import { useRouter } from 'next/navigation';

export default function PostingReportsPage() {
  const router = useRouter();

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

        {/* 統計概要カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: '平均チラシ閲覧時間', value: '1分 42秒', color: 'text-slate-900' },
            { label: '閲覧ユーザー数', value: '12,403', color: 'text-indigo-600' },
            { label: 'アクション率 (CTR)', value: '4.2%', color: 'text-green-500' },
            { label: '離脱率', value: '28%', color: 'text-orange-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* データ視覚化メインセクション */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 閲覧推移グラフ */}
          <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm min-h-[400px] flex flex-col">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
              エンゲージメント・タイムライン
            </h3>
            <div className="flex-1 flex items-end gap-2 px-2">
              {[40, 70, 45, 90, 65, 80, 100, 50, 70, 85, 60, 75, 95].map((h, i) => (
                <div key={i} className="flex-1 bg-indigo-50 rounded-t-xl relative group cursor-pointer" style={{ height: `${h}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {h}% 閲覧
                  </div>
                  <div className="absolute bottom-0 w-full bg-indigo-600 rounded-t-xl transition-all h-0 group-hover:h-full opacity-20"></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6 text-[8px] font-black text-slate-400 uppercase tracking-widest italic px-2">
              <span>月曜日</span><span>水曜日</span><span>金曜日</span><span>日曜日</span>
            </div>
          </div>

          {/* デモグラフィック内訳 */}
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
                  <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                    <span>{d.label}</span>
                    <span>{d.val}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className={d.color + " h-full"} style={{ width: `${d.val}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute -left-10 -bottom-10 text-[10rem] font-black italic opacity-5 select-none uppercase tracking-tighter">TARGET</div>
          </div>

        </div>

        {/* 下部詳細テーブル */}
        <div className="mt-8 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm overflow-hidden">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">マンション別パフォーマンス件数</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">対象物件名</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">配布数</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">閲覧数</th>
                  <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">アクション率</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold text-slate-700">
                <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-4 italic">スカイハイツ立川</td>
                  <td className="py-4 text-center">450</td>
                  <td className="py-4 text-center text-indigo-600 font-black">382</td>
                  <td className="py-4 text-right text-green-500 font-black">12.4%</td>
                </tr>
                <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-4 italic">パークレジデンス新宿</td>
                  <td className="py-4 text-center">820</td>
                  <td className="py-4 text-center text-indigo-600 font-black">612</td>
                  <td className="py-4 text-right text-green-500 font-black">8.2%</td>
                </tr>
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