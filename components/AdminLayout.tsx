'use client';
import { brandConfig } from '../lib/brand';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ✅ userType の型定義に 'ADMIN' を含む
export default function AdminLayout({ 
  children, 
  userType 
}: { 
  children: React.ReactNode, 
  userType: 'ADMIN' | 'SHOP' | 'MANAGER' | 'OWNER' 
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* サイドバー（PC用） - 印刷時は非表示(no-print) */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white p-6 no-print">
        <div className="mb-10">
          {/* 左上の表記を「ぽすっと」に固定統合 */}
          <h1 className="text-2xl font-black tracking-tighter italic uppercase text-blue-500">
            ぽすっと
          </h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">
            {userType === 'SHOP' ? 'Partner Portal' : userType === 'ADMIN' ? 'System Root' : 'Admin Console'}
          </p>
        </div>
        
        <nav className="space-y-2 flex-1">
          {/* 物件一覧・ダッシュボード */}
          <AdminNavLink 
            label="物件・エリア管理" 
            icon="🏙️" 
            href="/properties" 
            active={pathname === '/properties'} 
          />

          {/* レポーティング（ポスティング・管理会社・店舗・住民） */}
          <AdminNavLink 
            label="レポーティング" 
            icon="📈" 
            href="/management/reporting" 
            active={pathname.includes('/management/reporting')} 
          />
          
          {/* 広告配信・管理 */}
          <AdminNavLink 
            label="広告配信・管理" 
            icon="🎯" 
            href="/management/post-ad" 
            active={pathname === '/management/post-ad'} 
          />

          {/* 通知・掲示板管理 */}
          <AdminNavLink 
            label="通知・掲示板管理" 
            icon="🔔" 
            href="/management/notices" 
            active={pathname === '/management/notices'} 
          />

          {/* システム設定 */}
          <AdminNavLink 
            label="システム設定" 
            icon="⚙️" 
            href="/management/settings" 
            active={pathname === '/management/settings'} 
          />
        </nav>

        <div className="pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-[10px]">
              {userType.charAt(0)}
            </div>
            <div className="text-[10px]">
              <p className="font-black uppercase text-slate-200">
                {userType} USER
              </p>
              <button 
                onClick={() => {/* ログアウト処理 */}} 
                className="text-slate-500 hover:text-white transition font-bold"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* ヘッダー - 印刷時は非表示(no-print) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <h2 className="font-black text-[11px] text-slate-400 uppercase tracking-widest">System Status: Active</h2>
          </div>
          <div className="flex gap-4">
            <Link 
              href="/management/notices" 
              className="bg-slate-100 p-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition"
            >
              Notifications
            </Link>
            <Link 
              href="/properties/new" 
              className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition shadow-lg shadow-blue-900/10"
            >
              + New Property
            </Link>
          </div>
        </header>

        {/* コンテンツエリア */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="p-8">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// 共通リンクコンポーネント
function AdminNavLink({ label, icon, href, active = false }: { 
  label: string, 
  icon: string, 
  href: string, 
  active?: boolean 
}) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-1' 
          : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-black text-[11px] uppercase tracking-[0.15em]">{label}</span>
    </Link>
  );
}