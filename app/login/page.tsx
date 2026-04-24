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

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      // ロール名を大文字に統一（DBが user でも USER でも対応可能に）
      const dbRole = (profile?.role || 'USER').toUpperCase();

      // 3. スプレッドシートの定義に基づいた厳密なパス判定
      let targetPath = '';

      if (dbRole === 'ADMIN') {
        // ADMINはパラメータがあればその権限をシミュレート、なければ物件一覧(/properties)
        switch (typeParam) {
          case 'user':    targetPath = '/resident/dashboard'; break;
          case 'manager':  targetPath = '/management/notices'; break;
          case 'posting':  targetPath = '/posting/dashboard'; break;
          case 'shop':     targetPath = '/shop/post'; break;
          default:         targetPath = '/properties'; break;
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
        // それ以外（USER / 住民）
        targetPath = '/resident/dashboard';
      }

      console.log('Final Redirect Path:', targetPath);
      
      // 4. 強制リダイレクト（キャッシュの影響を受けないよう assign を使用）
      window.location.assign(targetPath);

    } catch (err: any) {
      alert('ログイン失敗: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl">
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black italic">POSUTTO</h1>
          <div className="mt-2">
            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest">
              {typeParam ? `Mode: ${typeParam}` : 'Portal'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="メールアドレス"
            className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-orange-500 font-bold transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="パスワード"
            className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-orange-500 font-bold transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button 
          className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black hover:bg-orange-600 transition-all active:scale-[0.98] shadow-lg"
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