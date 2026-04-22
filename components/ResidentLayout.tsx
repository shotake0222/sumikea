'use client';
import { brandConfig } from '../lib/brand';

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ヘッダー：ロゴ差し替え可能 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <span className="text-xl font-black tracking-tighter text-blue-600">
            {brandConfig.name}
          </span>
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
            <span className="text-xs">👤</span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 pb-24 max-w-md mx-auto w-full">
        {children}
      </main>

      {/* モバイル用ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-6 py-3 pb-8">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <NavItem icon="🏠" label="ホーム" active />
          <NavItem icon="🗑" label="ゴミ出し" />
          <NavItem icon="📍" label="お得" />
          <NavItem icon="🔔" label="通知" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, active = false }: any) {
  return (
    <button className={`flex flex-col items-center gap-1 ${active ? 'text-blue-600' : 'text-slate-400'}`}>
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}