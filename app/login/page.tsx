'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase'; // appの上の階層（ルート）にあるlibを参照
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert('ログインに失敗しました: ' + error.message);
      setLoading(false);
      return;
    }

    const role = data.user?.user_metadata?.role;

    // 画像のフォルダ構造に基づいたリダイレクト先
    if (role === 'ADMIN') {
      router.push('/properties');
    } else if (role === 'MANAGER') {
      router.push('/management/notices');
    } else if (role === 'POSTING') {
      router.push('/posting/dashboard');
    } else if (role === 'SHOP') {
      router.push('/shop/post');
    } else {
      router.push('/resident/dashboard');
    }

    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6"
      style={{ lineHeight: '1.25' }}
    >
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">ぽすっと</h1>
          <p className="text-[10px] text-orange-500 font-black mt-2 uppercase tracking-[0.3em]">Partner Portal</p>
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

      <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        © {new Date().getFullYear()} ぽすっと Project
      </p>
    </div>
  );
}