'use client';

import { useState, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';

function LoginContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // 表示確認用に dbRole を state に昇格
  const [displayRole, setDisplayRole] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type')?.toLowerCase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; 
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert('ログインに失敗しました: ' + error.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    // ✅ ロールの正規化（メタデータから確実に取得）
    const dbRole = user?.user_metadata?.role?.toUpperCase();
    setDisplayRole(dbRole);

    // --- 【完全修正版】ルーティング判定 ---
    let targetPath = '';

    // ✅ ADMIN は全知全能：typeParam に合わせてどこへでも行けるようにする
    if (dbRole === 'ADMIN') {
      if (typeParam === 'user') targetPath = '/resident/dashboard';
      else if (typeParam === 'manager') targetPath = '/management/notices';
      else if (typeParam === 'posting') targetPath = '/posting/dashboard';
      else if (typeParam === 'shop') targetPath = '/shop/post';
      else targetPath = '/properties'; // デフォルトは物件管理
    } 
    // ✅ 一般ロールの振り分け
    else if (dbRole === 'MANAGER') targetPath = '/management/notices';
    else if (dbRole === 'POSTING') targetPath = '/posting/dashboard';
    else if (dbRole === 'SHOP') targetPath = '/shop/post';
    else if (dbRole === 'USER') targetPath = '/resident/dashboard';
    else {
      targetPath = '/resident/dashboard'; // 最終フォールバック
    }

    // ✅ next/navigation の router.push を使い、少し待機してから遷移（確実に認証を通す）
    setTimeout(() => {
      // window.location.href よりも router.push の方が Next.js では安定します
      router.push(targetPath);
      router.refresh(); // セッションを確実に反映
    }, 100);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">ぽすっと</h1>
        <p className="text-[10px] text-orange-500 font-black mt-2 uppercase tracking-[0.3em]">
          {typeParam ? `${typeParam} Portal` : 'Login Console'}
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
          <input 
            type="email"
            className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
          <input 
            type="password"
            className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button 
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black shadow-lg transition active:scale-[0.98] mt-4 flex justify-center items-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'ログイン'
          )}
        </button>
      </form>

      <div className="mt-4 text-[8px] text-slate-400 text-center uppercase tracking-widest font-bold">
        Role: <span className="text-orange-500">{displayRole || 'Searching...'}</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <Suspense fallback={<div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}