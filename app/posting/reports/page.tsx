'use client';

import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';

export default function PostingReportsPage() {
  const router = useRouter();

  return (
    <AdminLayout userType="POSTING">
      <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen">
        
        {/* ヘッダー */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <button 
              onClick={() => router.back()}
              className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2 hover:translate-x-[-4px] transition-transform"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
              Analytics <span className="text-indigo-600">Deep Dive</span>
            </h1>
          </div>
          <div className="flex gap-3">
            <button className="bg-white border border-slate-200 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition">Export PDF</button>
            <button className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition shadow-lg">Download CSV</button>
          </div>
        </header>

        {/* 統計概要 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Avg Engagement Time', value: '1m 42s', color: 'text-slate-900' },
            { label: 'Unique Users', value: '12,403', color: 'text-indigo-600' },
            { label: 'Conversion Rate', value: '4.2%', color: 'text-green-500' },
            { label: 'Bounce Rate', value: '28%', color: 'text-orange-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* 視覚化セクション（ダミー表示） */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm min-h-[400px] flex flex-col">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10">Engagement Timeline</h3>
            <div className="flex-1 flex items-end gap-2 px-2">
              {[40, 70, 45, 90, 65, 80, 100, 50, 70, 85, 60, 75, 95].map((h, i) => (
                <div key={i} className="flex-1 bg-indigo-50 rounded-t-xl relative group cursor-pointer" style={{ height: `${h}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {h}%
                  </div>
                  <div className="absolute bottom-0 w-full bg-indigo-600 rounded-t-xl transition-all h-0 group-hover:h-full opacity-20"></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6 text-[8px] font-black text-slate-400 uppercase tracking-widest italic px-2">
              <span>Mon</span><span>Wed</span><span>Fri</span><span>Sun</span>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-10 relative z-10">Demographic Split</h3>
            <div className="space-y-8 relative z-10">
              {[
                { label: 'Family', val: 55, color: 'bg-indigo-500' },
                { label: 'Single', val: 25, color: 'bg-blue-400' },
                { label: 'Senior', val: 15, color: 'bg-purple-400' },
                { label: 'High-Income', val: 5, color: 'bg-emerald-400' },
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
            <div className="absolute -left-10 -bottom-10 text-[10rem] font-black italic opacity-5 select-none uppercase tracking-tighter">Target</div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}