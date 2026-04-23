'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function PostingDigitalDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [targetProperties, setTargetProperties] = useState<any[]>([]);
  const [pendingAds, setPendingAds] = useState<any[]>([]);

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.user_metadata?.role !== 'POSTING') {
        router.push('/login?type=posting');
        return;
      }

      // 1. ポスティング会社が「送信権限」を持つ物件を取得
      const { data: props } = await supabase
        .from('property_managers') // 権限テーブル（MANAGERと共用または別設定）
        .select('property_id, properties(name, address)')
        .eq('user_id', user.id);
      
      // 2. まだ送信（公開）されていない承認待ち広告などを取得
      // ※ここでは仮に直近の配信ログを表示
      setTargetProperties(props || []);
      setLoading(false);
    };
    initialize();
  }, [router]);

  if (loading) return <div className="p-8 text-center font-bold">デジタル投函システム起動中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" style={{ lineHeight: '1.25' }}>
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">Digital Dispatcher</span>
            <h1 className="text-3xl font-black text-slate-800 mt-2 tracking-tighter">デジタルポスティング実行画面</h1>
            <p className="text-slate-500 text-sm mt-1">物理的な投函作業をデジタル送信に置き換えます。</p>
          </div>
          <div className="bg-white px-6 py-4 rounded-3xl shadow-sm border border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase">送信可能物件</p>
            <p className="text-2xl font-black text-indigo-600">{targetProperties.length} <span className="text-sm">棟</span></p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側：物件リストと送信状況 */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-black text-slate-800 ml-2">担当物件のデジタル受信箱状況</h2>
            <div className="grid grid-cols-1 gap-4">
              {targetProperties.map((p: any) => (
                <div key={p.property_id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between hover:border-indigo-300 transition group">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-indigo-50">🏢</div>
                    <div>
                      <h3 className="font-black text-slate-800">{p.properties.name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold">{p.properties.address}</p>
                    </div>
                  </div>
                  <button className="bg-slate-900 text-white text-[10px] font-black px-6 py-3 rounded-full hover:bg-indigo-600 transition active:scale-95">
                    広告を送信する
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 右側：クイック統計と操作 */}
          <div className="space-y-6">
            <div className="bg-indigo-900 rounded-[3rem] p-8 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-6">Digital Reach Score</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold opacity-80">本日の総送信数</p>
                    <p className="text-3xl font-black">1,240 <span className="text-xs font-normal">住民</span></p>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded-full">
                    <div className="bg-indigo-400 h-full w-[70%]"></div>
                  </div>
                  <p className="text-[10px] font-medium opacity-60">※前日比 +12% のリーチ増加</p>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 text-9xl opacity-10 italic font-black">DIGITAL</div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200">
              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">ポスティング会社 業務フロー</h4>
              <ul className="text-[11px] space-y-3 font-bold text-slate-600">
                <li className="flex gap-2">
                  <span className="text-indigo-500">01.</span> 店舗から届いた広告案を確認
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">02.</span> 物件ごとの属性に合わせて選別
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">03.</span> デジタル「送信」で全住民へ届ける
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}