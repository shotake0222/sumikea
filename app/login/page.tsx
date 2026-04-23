'use client';

import { useState, Suspense } from 'react';
// ✅ インポートをやめて、直接 createClient を使います
import { createClient } from '@supabase/supabase-js';
import { useSearchParams, useRouter } from 'next/navigation';

// ✅ ファイル内で直接初期化（これでパス迷子が解消されます）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [displayRole, setDisplayRole] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type')?.toLowerCase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; 
    setLoading(true);
    
    // 1. サインイン実行
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (authError) {
      alert('ログインに失敗しました: ' + authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      alert('ユーザー情報が見つかりませんでした。');
      setLoading(false);
      return;
    }

    // 2. ロール特定
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, property_id')
      .eq('id', authData.user.id)
      .single();

    const dbRole = (profile?.role || authData.user.user_metadata?.role || 'USER').toUpperCase();
    setDisplayRole(dbRole);

    // 3. ルーティング判定
    let targetPath = '';
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
    else if (dbRole === 'USER') {
      targetPath = profile?.property_id ? `/p/${profile.property_id}` : '/resident/dashboard';
    }
    else {
      targetPath = '/properties';
    }

    // 4. ハードリダイレクト（セッションをブラウザに刻むため）
    setTimeout(() => {
      window.location.href = targetPath;
    }, 800);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="text-center mb-10">
        <div className="inline-block bg-orange-500 text-white p-3 rounded-2xl mb-4 shadow-lg shadow-orange-200 rotate-3">
          <span className="text-2xl font-bold">📩</span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">POSUTTO</h1>
        <p className="text-[10px] text-slate-400 font-black mt-2 uppercase tracking-[0.3em]">
          {typeParam ? `${typeParam} Authentication` : 'Login Console'}
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Email</label>
          <input 
            type="email"
            className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-slate-700 focus:border-orange-500 focus:bg-white outline-none transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@posutto.jp"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
          <input 
            type="password"
            className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-slate-700 focus:border-orange-500 focus:bg-white outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button 
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-orange-600 text-white py-5 rounded-[2rem] font-black shadow-lg transition-all active:scale-[0.98] mt-4 flex justify-center items-center text-lg tracking-tighter"
        >
          {loading ? 'Verifying...' : 'ログインして開始'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-6 font-sans">
      <Suspense fallback={<div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initialising Session...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}