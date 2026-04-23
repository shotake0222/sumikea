'use client';

import { useState, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';

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
    
    console.log("🚀 Login Attempt Started:", email);
    
    // 1. サインイン実行
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (authError) {
      console.error("❌ Auth Error:", authError.message);
      alert('ログインに失敗しました: ' + authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      alert('ユーザー情報が見つかりませんでした。');
      setLoading(false);
      return;
    }

    // 2. メタデータ + DB(profiles) の両方からロールを特定（最も確実な方法）
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    const dbRole = (profile?.role || authData.user.user_metadata?.role || 'USER').toUpperCase();
    setDisplayRole(dbRole);
    
    console.log("✅ Identity Verified. Role:", dbRole);

    // 3. ルーティング判定
    let targetPath = '';

    if (dbRole === 'ADMIN') {
      // ADMINはクエリパラメータ（type）に合わせてどこへでも行ける
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
    else targetPath = '/resident/setup'; // ロールはあるが紐付けがない場合

    console.log("📍 Redirecting to:", targetPath);

    // 4. セッションの永続化を待ってから確実に遷移
    // router.push ではなく、あえて window.location を使い、
    // かつセッションがセットされるための十分な猶予（800ms）を持たせます。
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
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs uppercase">Verifying...</span>
            </div>
          ) : (
            'ログインして開始'
          )}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-slate-50 text-[8px] text-slate-400 text-center uppercase tracking-widest font-bold">
        Detected Role: <span className="text-orange-500">{displayRole || 'None'}</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-6 font-sans">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-slate-900 border-t-orange-500 rounded-full" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initialising Session...</p>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </div>
  );
}