'use client';

import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type')?.toLowerCase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; 
    setLoading(true);
    
    try {
      // 1. まずサインイン
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) throw authError;

      // 2. ロールを profiles から取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const dbRole = (profile?.role || 'USER').toUpperCase();

      // 3. スプレッドシートに基づいた遷移先を決定
      let targetPath = '/resident/dashboard'; // デフォルト

      if (dbRole === 'ADMIN') {
        if (typeParam === 'user') targetPath = '/resident/dashboard';
        else if (typeParam === 'manager') targetPath = '/management/notices';
        else if (typeParam === 'posting') targetPath = '/posting/dashboard';
        else if (typeParam === 'shop') targetPath = '/shop/post';
        else targetPath = '/properties';
      } else if (dbRole === 'MANAGER') {
        targetPath = '/management/notices';
      } else if (dbRole === 'POSTING') {
        targetPath = '/posting/dashboard';
      } else if (dbRole === 'SHOP') {
        targetPath = '/shop/post';
      }

      // 【重要】もし遷移しないなら、ここで強制的にURLを書き換える
      console.log('Redirecting to:', targetPath);
      
      // router.push を使わず、ブラウザの機能でリフレッシュを伴う遷移をさせる
      window.location.assign(targetPath);

    } catch (err: any) {
      alert('ログイン失敗: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl">
      <form onSubmit={handleLogin} className="space-y-6">
        <h1 className="text-3xl font-black text-center mb-8 italic">POSUTTO</h1>
        <input 
          type="email" 
          placeholder="Email"
          className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 focus:border-orange-500 font-bold"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input 
          type="password"
          placeholder="Password"
          className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 focus:border-orange-500 font-bold"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button 
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black hover:bg-orange-600 transition-all"
          disabled={loading}
        >
          {loading ? '認証中...' : 'ログイン'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}