'use client';
import { useParams } from 'next/navigation';

export default function MonthDetailPage() {
  const { month } = useParams();

  // 本来はここで month に基づいて DB からデータを取得
  const mockData = [
    { type: '可燃ゴミ', days: ['月', '木'], icon: '🔥' },
    { type: '不燃ゴミ', days: ['第1・3水'], icon: '🏺' },
    { type: '資源ゴミ', days: ['金'], icon: '♻️' },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-slate-900">{month}月の予定</h1>
        <button className="text-sm font-bold text-orange-500">再スキャン</button>
      </div>

      <div className="space-y-4">
        {mockData.map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] flex items-center justify-between shadow-sm border border-slate-50">
            <div className="flex items-center gap-4">
              <div className="text-3xl bg-slate-50 w-14 h-14 flex items-center justify-center rounded-2xl">
                {item.icon}
              </div>
              <div>
                <p className="font-black text-slate-900">{item.type}</p>
                <p className="text-xs text-slate-400 font-bold">毎週 {item.days.join(', ')}</p>
              </div>
            </div>
            <button className="text-slate-300 hover:text-slate-600">
              ⚙️
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button className="w-full bg-white border-2 border-dashed border-slate-200 p-6 rounded-[2rem] text-slate-400 font-bold hover:bg-slate-100 transition">
          ＋ 収集項目を追加
        </button>
      </div>
      
      <div className="mt-10 flex gap-4">
        <button className="flex-1 bg-slate-200 text-slate-700 py-4 rounded-2xl font-black" onClick={() => window.history.back()}>
          戻る
        </button>
        <button className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-200">
          これで確定
        </button>
      </div>
    </div>
  );
}