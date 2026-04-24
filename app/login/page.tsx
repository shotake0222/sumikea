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
  // URLの?type=...を取得（小文字に統一）
  const typeParam = searchParams.get('type')?.toLowerCase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; 
    setLoading(true);
    
    try {
      // 1. サインイン実行（セッションをクリアにするために念のため）
      await supabase.auth.signOut();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('ユーザー情報が見つかりませんでした。');

      // 2. profilesテーブルから最新のロール情報を取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) console.error('Profile fetch error:', profileError);

      // ロールの正規化
      const dbRole = (profile?.role || 'USER').toUpperCase();

      // 3. スプレッドシート完全準拠のルーティング
      let targetPath = '';

      // URLにtypeパラメータがある場合、DBのロールに関わらずその画面を優先（ADMINのデバッグ用）
      if (typeParam) {
        switch (typeParam) {
          case 'admin':    targetPath = '/properties'; break;
          case 'manager':  targetPath = '/management/notices'; break;
          case 'posting':  targetPath = '/posting/dashboard'; break;
          case 'shop':     targetPath = '/shop/post'; break;
          case 'user':     targetPath = '/resident/dashboard'; break;
          default:         targetPath = '/resident/dashboard'; break;
        }
      } 
      // パラメータがない場合は、DBのロールに厳密に従う
      else {
        if (dbRole === 'ADMIN')   targetPath = '/properties';
        else if (dbRole === 'MANAGER') targetPath = '/management/notices';
        else if (dbRole === 'POSTING') targetPath = '/posting/dashboard';
        else if (dbRole === 'SHOP')    targetPath = '/shop/post';
        else                           targetPath = '/resident/dashboard';
      }

      // 4. 強制リダイレクト
      // キャッシュを回避し、確実にセッションを反映させるために href を使用
      window.location.href = targetPath;

    } catch (err: any) {
      alert('ログインに失敗しました: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter">POSUTTO</h1>
        <div className="mt-2 flex justify-center">
          <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            {typeParam ? `Login as ${typeParam}` : 'Portal Login'}
          </span>
        </div>
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
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black shadow-lg active:scale-95 transition-all"
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