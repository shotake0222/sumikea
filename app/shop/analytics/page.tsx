'use client';
import { useRouter } from 'next/navigation';

export default function ShopAnalyticsPage() {
  const router = useRouter();
  return (
    <div className="p-10 bg-[#F8FAFC] min-h-screen">
      <button onClick={() => router.back()} className="text-[10px] font-black text-blue-600 mb-4 tracking-widest uppercase">← Back</button>
      <h1 className="text-4xl font-black italic text-slate-900 uppercase tracking-tighter">Store <span className="text-blue-500">Analytics</span></h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        {[ {l: '総閲覧数', v: '1,240'}, {l: 'クーポン利用', v: '42'}, {l: '反応率', v: '3.4%'} ].map((s, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.l}</p>
            <p className="text-3xl font-black text-slate-900 mt-2 tracking-tighter">{s.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}