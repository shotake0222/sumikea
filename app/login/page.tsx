'use client';

import { useState, Suspense } from 'react';
// 環境が戻ったとのことですので、標準的なインポートに戻しています。
// もし再度パスエラーが出る場合は '@/lib/supabase' または直接初期化を試してください。
import { supabase } from '@/lib/supabase'; 
import { useSearchParams, useRouter } from 'next/navigation';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  // URLの?type=...パラメータを取得（ADMINのデバッグ用などに使用）
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

    // 2. profilesテーブルからロール情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    // DB上のロールを取得（未設定ならメタデータまたはUSERをデフォルトに）
    const dbRole = (profile?.role || authData.user.user_metadata?.role || 'USER').toUpperCase();

    // 3. スプレッドシートの定義に基づいたルーティング 
    let targetPath = '';

    if (dbRole === 'ADMIN') {
      // 運営・システム管理者の場合 
      // typeパラメータによる遷移先指定がある場合はそれに従い、なければ標準の /properties へ
      if (typeParam === 'user') targetPath = '/resident/dashboard';
      else if (typeParam === 'manager') targetPath = '/management/notices';
      else if (typeParam === 'posting') targetPath = '/posting/dashboard';
      else if (typeParam === 'shop') targetPath = '/shop/post';
      else targetPath = '/properties';
    } 
    else if (dbRole === 'MANAGER') {
      // 管理会社の場合 
      targetPath = '/management/notices';
    } 
    else if (dbRole === 'POSTING') {
      // ポスティング業者の場合 
      targetPath = '/posting/dashboard';
    } 
    else if (dbRole === 'SHOP') {
      // 近隣店舗の場合 
      targetPath = '/shop/post';
    } 
    else {
      // 住民（USER）およびその他の場合 
      targetPath = '/resident/dashboard';
    }

    // 4. 指定された画面へリダイレクト
    // セッションをブラウザに確実に反映させるため、window.location.href を使用します
    setTimeout(() => {
      window.location.href = targetPath;
    }, 500);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
      <div className="text-center mb-10">
        <div className="inline-block bg-orange-500 text-white p-3 rounded-2xl mb-4 shadow-lg rotate-3">
          <span className="text-2xl font-bold">📩</span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 italic">POSUTTO</h1>
        <p className="text-[10px] text-slate-400 font-black mt-2 uppercase tracking-[0.3em]">
          Authentication Portal
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <input 
          type="email"
          className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレス"
          required
        />
        <input 
          type="password"
          className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          required
        />
        <button 
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-orange-600 text-white py-5 rounded-[2rem] font-black shadow-lg transition-all active:scale-[0.98]"
        >
          {loading ? '認証中...' : 'ログインして開始'}
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
