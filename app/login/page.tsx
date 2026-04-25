'use client';

import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type')?.toLowerCase();
  
  // ユーザー(住民)モードかどうかを判定
  const isUserMode = typeParam === 'user';

  // 住民モードならデフォルトで新規登録画面、それ以外ならログイン画面を出す
  const [isSignUp, setIsSignUp] = useState(isUserMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; 
    setLoading(true);
    
    try {
      if (isSignUp) {
        // --- 【新規住民専用】サインアップフロー ---
        console.log('--- Resident Sign Up Start ---');
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('ユーザー作成に失敗しました');

        // profilesに初期値をインサート（物件未設定のUSERとして作成）
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ 
            id: authData.user.id, 
            role: 'USER',
            property_id: null 
          }]);
        
        if (profileError) console.error('Initial Profile DB Error:', profileError);

        // 新規登録完了後はセットアップへ強制遷移
        console.log('New User Created. Redirecting to setup...');
        window.location.href = '/resident/setup';

      } else {
        // --- 【管理者・既存ユーザー】ログインフロー ---
        console.log('--- Login Process Start ---');
        const { data, error: authError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (authError) throw authError;
        if (!data.user) throw new Error('ユーザーが見つかりません');

        // profilesテーブルから情報を取得
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, property_id')
          .eq('id', data.user.id)
          .single();

        if (profileError) console.error('Profile DB Error:', profileError);

        const dbRole = (profile?.role || 'USER').toUpperCase().trim();
        
        let targetPath = '';

        // ロールに基づいたパス判定（ディレクトリ構成変更を反映）
        if (dbRole === 'ADMIN') {
          if (typeParam === 'user') targetPath = '/resident/dashboard';
          else if (typeParam === 'manager') targetPath = '/manager/notices'; // 修正: management -> manager
          else if (typeParam === 'posting') targetPath = '/posting/dashboard';
          else if (typeParam === 'shop') targetPath = '/shop/post';
          else targetPath = '/properties';
        } 
        else if (dbRole === 'MANAGER') {
          // ✅ 管理会社のデフォルト遷移先を新ディレクトリへ
          targetPath = '/manager/notices'; 
        } 
        else if (dbRole === 'POSTING') {
          targetPath = '/posting/dashboard';
        } 
        else if (dbRole === 'SHOP') {
          targetPath = '/shop/post';
        } 
        else {
          // 一般ユーザー（USER）
          targetPath = profile?.property_id ? '/resident/dashboard' : '/resident/setup';
        }

        console.log('Target Destination:', targetPath);
        window.location.href = targetPath;
      }

    } catch (err: any) {
      console.error('Auth Error:', err);
      alert('エラー: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100">
      <form onSubmit={handleAuth} className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter text-slate-900">POSUTTO</h1>
          <div className="mt-2">
            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
              isUserMode ? 'bg-blue-100 text-blue-600' : 
              typeParam === 'manager' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : // 管理会社なら青
              'bg-orange-100 text-orange-600'
            }`}>
              {isUserMode ? (isSignUp ? 'Resident Sign Up' : 'Resident Login') : 
               typeParam === 'manager' ? 'Property Management Login' : `Auth Mode: ${typeParam || 'Staff'}`}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="メールアドレス"
            className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-slate-900 font-bold transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="パスワード"
            className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-slate-900 font-bold transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button 
          className={`w-full py-5 rounded-[2rem] font-black transition-all active:scale-[0.98] shadow-xl text-white ${
            typeParam === 'manager' ? 'bg-blue-600 hover:bg-slate-900' : 'bg-slate-900 hover:bg-orange-600'
          }`}
          disabled={loading}
        >
          {loading ? '処理中...' : (isSignUp ? '新規登録して次へ' : 'ログイン')}
        </button>

        {/* 住民モード（type=user）の場合のみ、登録とログインの切り替えを表示 */}
        {isUserMode && (
          <div className="text-center mt-6">
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[10px] font-black text-blue-600 uppercase tracking-tighter hover:underline"
            >
              {isSignUp ? '既にアカウントをお持ちの方はこちら' : '初めて利用する方（新規登録）はこちら'}
            </button>
          </div>
        )}
      </form>
      
      <p className="mt-8 text-center text-[8px] text-slate-300 font-bold uppercase tracking-[0.3em]">
        {isUserMode ? 'Resident Portal' : 'Management System'} v3.0
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