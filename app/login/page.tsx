'use client';

import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useSearchParams, useRouter } from 'next/navigation';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
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

    // 2. profilesテーブルから最新のロール情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    const dbRole = (profile?.role || authData.user.user_metadata?.role || 'USER').toUpperCase();

    // 3. スプレッドシートの定義  に基づいた厳密なルーティング
    let targetPath = '';

    if (dbRole === 'ADMIN') {
      // ADMINの場合、URLパラメータ(type)があればその権限の画面をシミュレート、なければ /properties 
      switch (typeParam) {
        case 'user':
          targetPath = '/resident/dashboard';
          break;
        case 'manager':
          targetPath = '/management/notices';
          break;
        case 'posting':
          targetPath = '/posting/dashboard';
          break;
        case 'shop':
          targetPath = '/shop/post';
          break;
        case 'admin':
        default:
          targetPath = '/properties';
          break;
      }
    } 
    else if (dbRole === 'MANAGER') {
      targetPath = '/management/notices';
    } 
    else if (dbRole === 'POSTING') {
      targetPath = '/posting/dashboard';
    } 
    else if (dbRole === 'SHOP') {
      targetPath = '/shop/post';
    } 
    else {
      // USER（住民）およびその他 
      targetPath = '/resident/dashboard';
    }

    // 4. リダイレクト（セッション反映の安全策）
    setTimeout(() => {
      window.location.href = targetPath;
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
        <div className="text-center mb-10">
          <div className="inline-block bg-orange-500 text-white p-3 rounded-2xl mb-4 shadow-lg rotate-3">
            <span className="text-2xl font-bold">📩</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">POSUTTO</h1>
          <p className="text-[10px] text-slate-400 font-black mt-2 uppercase tracking-[0.3em]">
            Authentication Portal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Email</label>
            <input 
              type="email"
              className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Password</label>
            <input 
              type="password"
              className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              required
            />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-orange-600 text-white py-5 rounded-[2rem] font-black shadow-lg transition-all active:scale-[0.98] mt-4"
          >
            {loading ? '認証中...' : 'ログインして開始'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}