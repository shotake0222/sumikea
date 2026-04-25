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
      console.log('--- Login Process Start ---');
      
      // 1. サインイン
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) throw authError;
      if (!data.user) throw new Error('ユーザーが見つかりません');

      // 2. profilesテーブルからロールを取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) console.error('Profile DB Error:', profileError);

      // ロールの判定（大文字小文字・前後の空白を削除して比較）
      const rawRole = profile?.role || 'USER';
      const dbRole = rawRole.toUpperCase().trim();
      
      console.log('Raw Role from DB:', rawRole);
      console.log('Normalized Role:', dbRole);
      console.log('URL Type Param:', typeParam);

      // 3. スプレッドシートの定義に基づいた厳密なパス判定
      let targetPath = '';

      // ロールが ADMIN または admin の場合
      if (dbRole === 'ADMIN') {
        console.log('Role matched: ADMIN');
        if (typeParam === 'user') targetPath = '/resident/dashboard';
        else if (typeParam === 'manager') targetPath = '/management/notices';
        else if (typeParam === 'posting') targetPath = '/posting/dashboard';
        else if (typeParam === 'shop') targetPath = '/shop/post';
        else targetPath = '/properties'; // ADMINのデフォルト
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
        // USER / 住民、またはそれ以外
        targetPath = '/resident/dashboard';
      }

      console.log('Target Destination:', targetPath);

      // 4. 遷移実行（.href を使用して強制的にページをロードし直す）
      if (targetPath) {
        window.location.href = targetPath;
      } else {
        throw new Error('遷移先の決定に失敗しました');
      }

    } catch (err: any) {
      console.error('Login Handler Error:', err);
      alert('ログイン失敗: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100">
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter text-slate-900">POSUTTO</h1>
          <div className="mt-2">
            <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase tracking-widest">
              {typeParam ? `Auth Mode: ${typeParam}` : 'Secure Portal'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input 
              type="email" 
              placeholder="メールアドレス"
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-slate-900 font-bold transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <input 
              type="password" 
              placeholder="パスワード"
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-slate-900 font-bold transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button 
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black hover:bg-orange-600 transition-all active:scale-[0.98] shadow-xl"
          disabled={loading}
        >
          {loading ? '認証中...' : 'ログイン'}
        </button>
      </form>
      
      <p className="mt-8 text-center text-[8px] text-slate-300 font-bold uppercase tracking-[0.3em]">
        Access Control System v2.9
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <Suspense fallback={<div className="font-black italic text-slate-400">Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}