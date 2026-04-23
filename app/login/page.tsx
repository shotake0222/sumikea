'use client';

import { useState, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [displayRole, setDisplayRole] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type')?.toLowerCase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; 
    setLoading(true);
    
    // 1. サインイン実行
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert('ログインに失敗しました: ' + error.message);
      setLoading(false);
      return;
    }

    // 2. 確実に最新のユーザー情報を取得（Authの反映待ちを防ぐ）
    const { data: { user } } = await supabase.auth.getUser();
    const dbRole = user?.user_metadata?.role?.toUpperCase();
    setDisplayRole(dbRole);

    let targetPath = '';

    // 3. ルーティング判定（ADMIN最強ルール）
    if (dbRole === 'ADMIN') {
      if (typeParam === 'user') targetPath = '/resident/dashboard';
      else if (typeParam === 'manager') targetPath = '/management/notices';
      else if (typeParam === 'posting') targetPath = '/posting/dashboard';
      else if (typeParam === 'shop') targetPath = '/shop/post';
      else targetPath = '/properties';
    } 
    else if (dbRole === 'MANAGER') targetPath = '/management/notices';
    else if (dbRole === 'POSTING') targetPath = '/posting/dashboard';
    else if (dbRole === 'SHOP') targetPath = '/shop/post';
    else if (dbRole === 'USER') targetPath = '/resident/dashboard';
    else targetPath = '/properties';

    // 4. 【重要】フルリロードを伴う遷移
    // これにより遷移先のページが最新のセッションを確実に読み込みます
    if (targetPath) {
      window.location.href = targetPath;
    } else {
      setLoading(false);
    }
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