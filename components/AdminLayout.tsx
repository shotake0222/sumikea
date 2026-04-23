'use client';
import { brandConfig } from '../lib/brand';

// ✅ 修正：userType の型定義に 'ADMIN' を追加
export default function AdminLayout({ 
  children, 
  userType 
}: { 
  children: React.ReactNode, 
  userType: 'ADMIN' | 'SHOP' | 'MANAGER' | 'OWNER' 
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* サイドバー（PC用、モバイル時はハンバーガー） */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white p-6">
        <div className="mb-10">
          <h1 className="text-2xl font-black">{brandConfig.name}</h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
            {/* ADMIN の場合の表示を追加 */}
            {userType === 'SHOP' ? 'Partner Portal' : userType === 'ADMIN' ? 'System Root' : 'Admin Console'}
          </p>
        </div>
        
        <nav className="space-y-2 flex-1">
          <AdminNavLink label="ダッシュボード" icon="📊" active />
          <AdminNavLink label="広告配信・管理" icon="🚀" />
          <AdminNavLink label="分析レポート" icon="📈" />
          <AdminNavLink label="設定" icon="⚙️" />
        </nav>

        <div className="pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
            <div className="text-xs">
              <p className="font-bold">管理者ユーザー</p>
              <p className="text-slate-400">ログアウト</p>
            </div>
          </div>
        </div>
      </aside>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h2 className="font-bold text-slate-700">現在のステータス: 稼働中</h2>
          <div className="flex gap-4">
            <button className="bg-slate-100 p-2 rounded-lg text-sm">通知</button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">新規作成</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminNavLink({ label, icon, active = false }: any) {
  return (
    <a href="#" className={`flex items-center gap-3 p-3 rounded-xl transition ${active ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
      <span>{icon}</span>
      <span className="font-bold text-sm">{label}</span>
    </a>
  );
}