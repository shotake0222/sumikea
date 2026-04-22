'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ShopStatsPage() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // 先ほど作成した VIEW からデータを取得
      const { data } = await supabase.from('ad_performance').select('*');
      if (data) setStats(data);
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
        <span className="mr-2">📊</span> 広告配信レポート
      </h1>

      {loading ? (
        <p className="text-center py-10 text-gray-400">レポートを集計中...</p>
      ) : (
        <div className="space-y-4">
          {stats.map((ad) => (
            <div key={ad.ad_id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mb-1">
                    {ad.property_name} 配信分
                  </p>
                  <h2 className="font-bold text-gray-800">{ad.title}</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">閲覧数（IMP）</p>
                  <p className="text-2xl font-black text-gray-800">{ad.total_views}<span className="text-xs ml-1">回</span></p>
                </div>
                <div className="text-center border-l">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">最終閲覧</p>
                  <p className="text-xs mt-2 font-medium text-gray-600">
                    {ad.last_viewed_at ? new Date(ad.last_viewed_at).toLocaleDateString() : '---'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {stats.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border-dashed border-2">
              <p className="text-sm text-gray-400">まだ配信データがありません</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-600 rounded-2xl text-white shadow-lg">
        <h3 className="font-bold text-sm mb-1">ポスティングDXのヒント</h3>
        <p className="text-[10px] leading-relaxed opacity-90">
          紙のチラシでは不可能な「リアルタイムの閲覧数」が可視化されています。
          閲覧数が少ない場合は、キャッチコピーをより物件の特性に合わせたもの（例：ファミリー向け物件なら「夕飯のおかず」など）に修正すると効果的です。
        </p>
      </div>
    </div>
  );
}