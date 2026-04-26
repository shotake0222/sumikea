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
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('ユーザー作成に失敗しました');

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ 
            id: authData.user.id, 
            role: 'USER',
            property_id: null 
          }]);
        
        if (profileError) throw new Error('プロフィールの作成に失敗しました。');

        window.location.href = '/resident/setup';

      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (authError) throw authError;
        if (!data.user) throw new Error('ユーザーが見つかりません');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, property_id')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          await supabase.auth.signOut();
          throw new Error('プロフィールが見つかりません。');
        }

        const dbRole = (profile?.role || 'USER').toUpperCase().trim();
        
        let isAuthorized = false;
        if (typeParam === 'admin') {
          if (dbRole === 'ADMIN') isAuthorized = true;
        } else if (typeParam === 'manager') {
          if (dbRole === 'MANAGER' || dbRole === 'ADMIN') isAuthorized = true;
        } else if (typeParam === 'posting') {
          if (dbRole === 'POSTING' || dbRole === 'ADMIN') isAuthorized = true;
        } else if (typeParam === 'shop') {
          if (dbRole === 'SHOP' || dbRole === 'ADMIN') isAuthorized = true;
        } else if (isUserMode) {
          if (dbRole === 'USER' || dbRole === 'ADMIN') isAuthorized = true;
        } else {
          isAuthorized = true;
        }

        if (!isAuthorized) {
          await supabase.auth.signOut();
          throw new Error(`このアカウントにはアクセス権限がありません。(権限: ${dbRole})`);
        }

        let targetPath = '';
        if (dbRole === 'ADMIN') {
          if (typeParam === 'user') targetPath = '/resident/dashboard';
          else if (typeParam === 'manager') targetPath = '/manager/notices'; 
          else if (typeParam === 'posting') targetPath = '/posting/dashboard';
          else if (typeParam === 'shop') targetPath = '/shop/post';
          else targetPath = '/properties'; 
        } 
        else if (dbRole === 'MANAGER') targetPath = '/manager/notices'; 
        else if (dbRole === 'POSTING') targetPath = '/posting/dashboard';
        else if (dbRole === 'SHOP') targetPath = '/shop/post';
        else {
          targetPath = profile?.property_id ? '/resident/dashboard' : '/resident/setup';
        }

        window.location.href = targetPath;
      }

    } catch (err: any) {
      alert('認証エラー: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[3.5rem] p-10 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-50 relative overflow-hidden">
      {/* デザインのアクセント */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full opacity-50 blur-3xl"></div>
      
      <form onSubmit={handleAuth} className="space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase">Posutto</h1>
          <div>
            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${
              isUserMode ? 'bg-blue-600 text-white' : 
              typeParam === 'manager' ? 'bg-slate-900 text-white' : 
              'bg-orange-500 text-white'
            }`}>
              {isUserMode ? (isSignUp ? 'New Resident' : 'Welcome Back') : 'Management Portal'}
            </span>
          </div>
        </div>

        {/* 住民モード時のみ表示される大きな切り替えタブ */}
        {isUserMode && (
          <div className="flex bg-slate-100 p-1.5 rounded-3xl">
            <button 
              type="button" 
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all ${isSignUp ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}
            >
              新規登録
            </button>
            <button 
              type="button" 
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all ${!isSignUp ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}
            >
              ログイン
            </button>
          </div>
        )}

        <div className="space-y-5">
          <div className="group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Email Address</label>
            <input 
              type="email" 
              placeholder="example@mail.com"
              className="w-full p-5 bg-slate-50 rounded-[1.8rem] outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white font-bold transition-all shadow-inner"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">
              {isSignUp ? 'Set New Password' : 'Password'}
            </label>
            <input 
              type="password" 
              placeholder={isSignUp ? "新しいパスワードを決めてください" : "パスワードを入力"}
              className="w-full p-5 bg-slate-50 rounded-[1.8rem] outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white font-bold transition-all shadow-inner"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {isSignUp && (
              <p className="text-[9px] font-bold text-blue-500 mt-2 ml-4 italic opacity-80">
                ※このパスワードは、2回目以降のログインで使用します。
              </p>
            )}
          </div>
        </div>

        <button 
          className={`w-full py-6 rounded-[2.2rem] font-black transition-all active:scale-[0.97] shadow-2xl text-white text-lg tracking-tighter italic uppercase ${
            typeParam === 'manager' || typeParam === 'admin' ? 'bg-slate-900 hover:bg-blue-600' : 
            isUserMode ? 'bg-blue-600 hover:bg-slate-900 shadow-blue-200' : 'bg-orange-500 hover:bg-slate-900'
          }`}
          disabled={loading}
        >
          {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>

        {!isUserMode && (
          <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] pt-4">
            Authorized Personnel Only
          </p>
        )}
      </form>
      
      <p className="mt-12 text-center text-[9px] text-slate-300 font-bold uppercase tracking-[0.4em]">
        Posutto Smart Portal v3.8
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-6 font-sans">
      <Suspense fallback={<div className="font-black italic text-slate-400 animate-pulse">Initializing Portal...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}