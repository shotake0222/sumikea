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
      // 1. サインイン実行
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('User not found');

      // 2. profilesテーブルからロール情報を取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      // DB上のロール（大文字で統一）
      const dbRole = (profile?.role || 'USER').toUpperCase();

      // 3. スプレッドシートの定義に基づいた厳密なパス判定
      let targetPath = '';

      // ADMINの場合、URLパラメータがあればその画面を、なければ管理画面へ
      if (dbRole === 'ADMIN') {
        if (typeParam === 'user') targetPath = '/resident/dashboard';
        else if (typeParam === 'manager') targetPath = '/management/notices';
        else if (typeParam === 'posting') targetPath = '/posting/dashboard';
        else if (typeParam === 'shop') targetPath = '/shop/post';
        else targetPath = '/properties';
      } 
      // 一般ロールの場合（スプレッドシート準拠）
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
        // 住民（USER）
        targetPath = '/resident/dashboard';
      }

      // 4. 強制リダイレクト
      // next/navigation の router.push よりも確実にページを切り替えるため
      // window.location.replace を使用します（履歴に残さず遷移）
      if (targetPath) {
        window.location.replace(targetPath);
      }

    } catch (err: any) {
      alert('エラー: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100">
      <div className="text-center mb-10">
        <div className="inline-block bg-orange-500 text-white p-3 rounded-2xl mb-4 shadow-lg rotate-3">
          <span className="text-2xl font-bold">📩</span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter">POSUTTO</h1>
        <p className="text-[10px] text-slate-400 font-black mt-2 uppercase tracking-[0.3em]">
          {typeParam ? `Auth Mode: ${typeParam}` : 'Portal Access'}
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <input 
          type="email"
          className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-orange-500 outline-none transition-all"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレス"
          required
        />
        <input 
          type="password"
          className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-orange-500 outline-none transition-all"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          required
        />
        <button 
          disabled={loading}
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black shadow-lg hover:bg-orange-600 transition-all active:scale-[0.98]"
        >
          {loading ? '認証中...' : 'ログイン'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-6 font-sans">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}