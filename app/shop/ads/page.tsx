'use client';
import { useRouter } from 'next/navigation';

export default function ShopAdsPage() {
  const router = useRouter();
  return (
    <div className="p-10 bg-[#F8FAFC] min-h-screen">
      <button onClick={() => router.back()} className="text-[10px] font-black text-orange-600 mb-4 tracking-widest uppercase">← Back</button>
      <h1 className="text-4xl font-black italic text-slate-900 uppercase tracking-tighter">Ads <span className="text-orange-500">Management</span></h1>
      <div className="mt-10 bg-white p-20 rounded-[3rem] border border-slate-100 text-center shadow-sm">
        <p className="text-slate-400 font-bold italic">広告一覧データを読み込み中、またはデータがありません。</p>
      </div>
    </div>
  );
}