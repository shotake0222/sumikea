'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ShopStatsPage() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.from('ad_performance').select('*');
      if (data) setStats(data);
      setLoading(false);
    };
    fetchStats();
  }, []);

  // --- 追加：パフォーマンスに応じた改善アドバイスロジック ---
  const getAdvice = (views: number) => {
    if (views === 0) return {
      text: "まだ閲覧がありません。ゴミ出し時間（朝8時前後）に合わせた内容へ更新してみましょう。",
      color: "text-gray-600", bg: "bg-gray-100"
    };
    if (views < 10) return {
      text: "【改善案】タイトルに物件名を入れ、住民限定感を出すと閲覧率が2倍以上変わります。",
      color: "text-orange-700", bg: "bg-orange-50"
    };
    return {
      text: "【好調】多くの住民がチェックしています！次は『期間限定クーポン』で来店を促しましょう。",
      color: "text-green-700", bg: "bg-green-50"
    };
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
        <span className="mr-2">📊</span> 配信成果レポート
      </h1>

      {loading ? (
        <p className="text-center py-10 text-gray-400 animate-pulse">データを集計中...</p>
      ) : (
        <div className="space-y-4">
          {stats.map((ad) => {
            const advice = getAdvice(ad.total_views);
            return (
              <div key={ad.ad_id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mb-1">
                        {ad.property_name} ターゲット
                      </p>
                      <h2 className="font-bold text-gray-800 leading-tight">{ad.title}</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">閲覧数</p>
                      <p className="text-3xl font-black text-gray-800">{ad.total_views}<span className="text-xs ml-1 font-normal">回</span></p>
                    </div>
                    <div className="text-center border-l border-gray-50 flex flex-col justify-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">最終閲覧</p>
                      <p className="text-xs mt-1 font-bold text-gray-600 italic">
                        {ad.last_viewed_at ? new Date(ad.last_viewed_at).toLocaleTimeString('ja-JP', {hour: '2-digit', minute:'2-digit'}) : '---'}
                      </p>
                    </div>
                  </div>

                  {/* アドバイスセクション */}
                  <div className={`mt-4 p-3 rounded-2xl ${advice.bg}`}>
                    <div className="flex items-center mb-1">
                      <span className="text-xs">💡</span>
                      <p className={`text-[10px] font-black ml-1 uppercase tracking-tighter ${advice.color}`}>DXアドバイス</p>
                    </div>
                    <p className={`text-[11px] font-medium leading-relaxed ${advice.color}`}>
                      {advice.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          
          {stats.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border-dashed border-2 border-gray-200">
              <p className="text-sm text-gray-400 font-medium">配信データがまだ蓄積されていません</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 p-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl text-white shadow-xl shadow-blue-200">
        <h3 className="font-bold text-sm mb-2 flex items-center">
          <span className="mr-2">📈</span> ポスティングDXの優位性
        </h3>
        <p className="text-[10px] leading-relaxed opacity-90 font-medium">
          紙のチラシと違い、「何時ごろに見られているか」を把握できます。
          反応が良い時間帯に合わせて、タイムセールの告知などを打ち出すと来店転換率（CVR）がさらに向上します。
        </p>
      </div>
    </div>
  );
}

// 印刷用ボタンを追加
const handlePrint = () => {
  window.print(); // ブラウザの印刷機能を呼び出し
};

// ... return 内 ...
<div className="flex justify-between items-center mb-6 no-print">
  <h1 className="text-xl font-bold text-gray-800">📊 配信成果レポート</h1>
  <button 
    onClick={handlePrint}
    className="bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black"
  >
    レポートを保存/印刷
  </button>
</div>

{/* 印刷時にだけ見えるサマリー（営業資料用） */}
<div className="hidden print:block mb-8 border-b-2 pb-4">
  <h1 className="text-3xl font-black mb-2">AD Performance Report</h1>
  <p className="text-gray-500">発行日: {new Date().toLocaleDateString()}</p>
  <div className="mt-6 p-4 bg-gray-100 rounded-lg">
    <p className="text-lg font-bold">総インプレッション数: {stats.reduce((acc, s) => acc + s.total_views, 0)}回</p>
    <p className="text-sm text-gray-600">※本レポートはポスティングDXシステムにより自動生成されました。</p>
  </div>
</div>