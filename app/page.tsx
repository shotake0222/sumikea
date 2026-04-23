'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const [myAds, setMyAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 本来はログインユーザーの所属物件IDを取得しますが、ここでは 'prop_123' と仮定します
  const userPropertyId = 'prop_123'; 

  useEffect(() => {
    const fetchMyAds = async () => {
      setLoading(true);
      // 自分の物件IDが target_property_ids 配列に含まれているものだけを取得
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .contains('target_property_ids', [userPropertyId])
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMyAds(data);
      }
      setLoading(false);
    };

    fetchMyAds();
  }, [userPropertyId]);

  return (
    <div className="max-w-md mx-auto p-8 min-h-screen flex flex-col items-center bg-gray-50">
      <h1 className="text-3xl font-extrabold text-blue-600 mb-2 mt-12">sumikea</h1>
      <p className="text-gray-500 mb-8 text-center">物件単位の生活インフラ情報アプリ</p>
      
      {/* 住民向け：届いているデジタルチラシの表示エリア */}
      <div className="w-full mb-12">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">あなたのお家への届出</h2>
        
        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">読み込み中...</p>
        ) : myAds.length > 0 ? (
          <div className="space-y-4">
            {myAds.map((ad) => (
              <div key={ad.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition active:scale-[0.98]">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase">
                    {ad.store_name || 'お知らせ'}
                  </span>
                  <span className="text-[10px] text-gray-300">
                    {new Date(ad.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-sm font-black text-gray-800 leading-tight mb-2">
                  {ad.title}
                </h3>
                <p className="text-[11px] text-gray-500 line-clamp-2">
                  {ad.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center">
            <p className="text-sm text-gray-400">現在、新しいチラシはありません</p>
          </div>
        )}
      </div>

      <div className="w-full space-y-4">
        <Link href="/properties" className="block w-full bg-blue-600 text-white text-center py-4 rounded-xl font-bold shadow-lg">
          管理者ページ（物件登録）
        </Link>
        <Link href="/shop/post" className="block w-full bg-orange-500 text-white text-center py-4 rounded-xl font-bold shadow-lg">
          店舗ページ（広告投稿）
        </Link>
      </div>
      
      <div className="mt-12 p-4 bg-white rounded-lg border border-gray-200 text-sm text-gray-400">
        <p>※住民の方は、配布された専用の二次元コードからアクセスしてください。</p>
      </div>
    </div>
  );
}