'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase'; // 1つ上

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
          router.push('/properties'); 
        } else if (role === 'POSTING') {
          router.push('/posting/dashboard'); // 【追加】ポスティング会社用
        } else if (role === 'SHOP') {
          router.push('/shop/post'); 
        } else if (role === 'MANAGER') {
          router.push('/management/notice'); // 既存の管理会社パスへ
        }
        // RESIDENTの場合は、このページで物件情報や広告を表示
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
    <div 
      className="max-w-md mx-auto p-8 min-h-screen flex flex-col items-center justify-between bg-gray-50"
      style={{ lineHeight: '1.25' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <h1 className="text-4xl font-black text-blue-600 mb-2 tracking-tighter">sumikea</h1>
        <p className="text-gray-400 mb-12 text-center text-sm font-medium uppercase tracking-[0.3em]">Smart Life Infrastructure</p>
        
        <div className="w-full space-y-6">
          {/* 【住民入口】RESIDENT */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Resident Access</h2>
            <Link href="/resident/login" className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-4 rounded-2xl font-bold shadow-lg transition active:scale-95">
              住民の方はこちら
            </Link>
          </div>

          {/* 【ビジネス入口】パートナーセクション */}
          <div className="pt-8 border-t border-gray-200">
            <h2 className="text-[10px] font-black text-center text-gray-300 uppercase tracking-widest mb-6">Business Partners</h2>
            
            <div className="space-y-3 mb-6">
              {/* 管理会社入口 (MANAGEMENT) */}
              <Link href="/login?type=manager" className="group block">
                <div className="bg-white p-4 rounded-2xl flex items-center gap-4 group-hover:bg-blue-50 transition border border-gray-100 group-hover:border-blue-200 shadow-sm">
                  <span className="text-2xl">📑</span>
                  <div className="text-left">
                    <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-600 block leading-none mb-1 uppercase">Property Manager</span>
                    <span className="text-sm font-bold text-slate-700">管理会社ログイン</span>
                  </div>
                </div>
              </Link>

              {/* ポスティング会社入口 (POSTING) */}
              <Link href="/login?type=posting" className="group block">
                <div className="bg-white p-4 rounded-2xl flex items-center gap-4 group-hover:bg-orange-50 transition border border-gray-100 group-hover:border-orange-200 shadow-sm">
                  <span className="text-2xl">🛵</span>
                  <div className="text-left">
                    <span className="text-[10px] font-black text-slate-400 group-hover:text-orange-600 block leading-none mb-1 uppercase">Posting Operator</span>
                    <span className="text-sm font-bold text-slate-700">ポスティング会社ログイン</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* 店舗・運営 (SHOP / ADMIN) */}
            <div className="grid grid-cols-2 gap-4">
              <Link href="/login?type=shop" className="group">
                <div className="bg-slate-100 p-4 rounded-2xl text-center group-hover:bg-emerald-50 transition border border-transparent group-hover:border-emerald-100">
                  <span className="text-lg block mb-1">🏪</span>
                  <span className="text-[10px] font-black text-slate-500 group-hover:text-emerald-600 uppercase">店舗ログイン</span>
                </div>
              </Link>
              <Link href="/login?type=admin" className="group">
                <div className="bg-slate-100 p-4 rounded-2xl text-center group-hover:bg-slate-200 transition border border-transparent">
                  <span className="text-lg block mb-1">🏢</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase">運営ログイン</span>
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