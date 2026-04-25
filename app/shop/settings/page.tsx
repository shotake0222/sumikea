'use client';
import { useRouter } from 'next/navigation';

export default function ShopSettingsPage() {
  const router = useRouter();
  return (
    <div className="p-10 bg-[#F8FAFC] min-h-screen">
      <button onClick={() => router.back()} className="text-[10px] font-black text-slate-400 mb-4 tracking-widest uppercase">← Back</button>
      <h1 className="text-4xl font-black italic text-slate-900 uppercase tracking-tighter">Shop <span className="text-slate-400">Settings</span></h1>
      <div className="mt-10 bg-white p-10 rounded-[3rem] shadow-sm max-w-2xl">
        <p className="text-sm font-bold text-slate-600 mb-8">店舗情報の編集（準備中）</p>
        <div className="space-y-4">
          <div className="h-12 bg-slate-50 rounded-xl"></div>
          <div className="h-12 bg-slate-50 rounded-xl"></div>
          <div className="h-32 bg-slate-50 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}