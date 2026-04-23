'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        // ログイン済みの場合、役割に応じてリダイレクトを試みる
        const role = session.user.user_metadata?.role; 
        
        if (role === 'ADMIN') {
          router.push('/properties'); // ポスティング会社（運営）用
        } else if (role === 'SHOP') {
          router.push('/shop/post'); // 広告出稿店舗用
        }
        // 住民(USER)の場合はそのままトップページで広告を見る
      }
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8 min-h-screen flex flex-col items-center justify-between bg-gray-50">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <h1 className="text-4xl font-black text-blue-600 mb-2 tracking-tighter">sumikea</h1>
        <p className="text-gray-400 mb-12 text-center text-sm font-medium uppercase tracking-[0.3em]">Smart Life Infrastructure</p>
        
        <div className="w-full space-y-6">
          {/* 【住民入口】QRコードから来る一般ユーザーはここがメイン */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Resident Access</h2>
            <Link href="/resident/login" className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-4 rounded-2xl font-bold shadow-lg transition active:scale-95">
              住民の方はこちら
            </Link>
          </div>

          {/* 【ビジネス入口】店舗や運営は「パートナー」として入り口を分ける */}
          <div className="pt-8 border-t border-gray-200">
            <h2 className="text-[10px] font-black text-center text-gray-300 uppercase tracking-widest mb-6">Business Partners</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/login?type=shop" className="group">
                <div className="bg-slate-100 p-4 rounded-2xl text-center group-hover:bg-orange-50 transition border border-transparent group-hover:border-orange-100">
                  <span className="text-lg block mb-1">🏪</span>
                  <span className="text-[10px] font-black text-slate-500 group-hover:text-orange-600">店舗ログイン</span>
                </div>
              </Link>
              <Link href="/login?type=admin" className="group">
                <div className="bg-slate-100 p-4 rounded-2xl text-center group-hover:bg-blue-50 transition border border-transparent group-hover:border-blue-100">
                  <span className="text-lg block mb-1">🏢</span>
                  <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-600">運営ログイン</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 text-center">
        <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
          ※住民の方は、配布された専用の二次元コードから<br />直接アクセスしていただくと自動でログインできます。
        </p>
      </div>
    </div>
  );
}