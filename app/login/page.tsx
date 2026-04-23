'use client';

import { useState, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URLの ?type= の値を取得
  const typeParam = searchParams.get('type')?.toLowerCase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert('ログインに失敗しました: ' + error.message);
      setLoading(false);
      return;
    }

    // データベース上の Role を取得
    const dbRole = data.user?.user_metadata?.role;

    // --- スプレッドシートの定義に基づくリダイレクト判定 ---
    
    // 1. 住民 (USER)
    if (typeParam === 'user' || dbRole === 'USER') {
      router.push('/resident/dashboard');
    }
    // 2. 管理会社 (MANAGER)
    else if (typeParam === 'manager' || dbRole === 'MANAGER') {
      router.push('/management/notices');
    }
    // 3. ポスティング業者 (POSTING)
    else if (typeParam === 'posting' || dbRole === 'POSTING') {
      router.push('/posting/dashboard');
    }
    // 4. 近隣店舗 (SHOP)
    else if (typeParam === 'shop' || dbRole === 'SHOP') {
      router.push('/shop/post');
    }
    // 5. 運営管理 (ADMIN) -> shotake0222@gmail.com など
    else if (typeParam === 'admin' || dbRole === 'ADMIN') {
      router.push('/properties');
    }
    // どれにも該当しない場合のフォールバック（ADMINページへ）
    else {
      router.push('/properties');
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">ぽすっと</h1>
        <p className="text-[10px] text-orange-500 font-black mt-2 uppercase tracking-[0.3em]">
          {typeParam === 'user' ? 'Resident Portal' : 'Partner Portal'}
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
          className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black shadow-lg transition active:scale-[0.98] mt-4"
        >
          {loading ? '認証中...' : 'ログイン'}
        </button>
      </form>
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