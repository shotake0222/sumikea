'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ロゴ画像のパス（publicフォルダに logo.png 等を置いた場合）
  const logoPath = "./logo.png"; 

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

    if (role === 'ADMIN') {
      router.push('/properties');
    } else if (role === 'MANAGER') {
      router.push('/management/notice');
    } else if (role === 'POSTING') {
      router.push('/posting/dashboard');
    } else if (role === 'SHOP') {
      router.push('/shop/post');
    } else {
      router.push('/');
    }

    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6"
      style={{ lineHeight: '1.25' }}
    >
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/60 border border-slate-100">
        
        {/* ロゴ・タイトルセクション */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            {/* ロゴ画像がある場合はこちらを表示（なければテキストのみ） */}
            <div className="relative w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
              <span className="text-white text-3xl font-black">P</span>
              {/* 実際のロゴ画像を使う場合は以下をアンコメント */}
              {/* <Image src={logoPath} alt="ぽすっと ロゴ" width={64} height={64} className="object-contain" /> */}
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">ぽすっと</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account ID (Email)</label>
            <input 
              type="email"
              className="w-full bg-slate-50 border-none p-5 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none placeholder:text-slate-300"
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
              className="w-full bg-slate-50 border-none p-5 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none placeholder:text-slate-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black shadow-xl transition active:scale-[0.98] mt-4 disabled:opacity-50"
          >
            {loading ? '認証中...' : 'パートナーログイン'}
          </button>
        </form>
      </div>

      <div className="mt-10 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
          © {new Date().getFullYear()} ぽすっと Project<br />
          Next-Gen Delivery Infrastructure
        </p>
      </div>
    </div>
  );
}