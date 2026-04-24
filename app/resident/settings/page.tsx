'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ComingSoonPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-white font-sans text-center">
      <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-24 h-24 bg-slate-800 rounded-[2.5rem] mx-auto flex items-center justify-center text-4xl shadow-2xl border border-slate-700">
          🛠️
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tighter italic uppercase">Coming Soon</h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">この機能は現在準備中です</p>
        </div>

        <p className="text-slate-500 text-xs leading-relaxed">
          住民の皆様により便利にご利用いただけるよう、<br />
          現在エンジニアが鋭意開発を行っております。<br />
          リリースまで今しばらくお待ちください。
        </p>

        <div className="pt-8">
          <button 
            onClick={() => router.back()}
            className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-500 transition-all active:scale-[0.97]"
          >
            ← 戻る
          </button>
          
          <Link href="/resident/dashboard" className="block mt-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors">
            ダッシュボードへ移動
          </Link>
        </div>

        <footer className="pt-20 text-[9px] text-slate-800 font-bold uppercase tracking-[0.4em]">
          Posutto Digital Protocol v2.5
        </footer>
      </div>
    </div>
  );
}