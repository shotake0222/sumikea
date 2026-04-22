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

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const getAdvice = (views: number) => {
    if (views === 0) return { text: "まだ閲覧がありません。朝のゴミ出し時間帯を狙った内容に更新しましょう。", color: "text-gray-600", bg: "bg-gray-100" };
    if (views < 10) return { text: "【改善案】タイトルに物件名を入れ、住民限定感を出すと閲覧率が向上します。", color: "text-orange-700", bg: "bg-orange-50" };
    return { text: "【好調】多くの住民がチェックしています！次は期間限定クーポンで来店を促しましょう。", color: "text-green-700", bg: "bg-green-50" };
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-50 min-h-screen">
      {/* --- 営業用レポート：印刷時のみ表示 --- */}
      <div className="hidden print:block mb-8 border-b-2 pb-4">
        <h1 className="text-2xl font-black mb-1 text-gray-900 font-sans">AD PERFORMANCE REPORT</h1>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Digital Post Delivery Stats</p>
        <div className="mt-6 p-4 bg-gray-50 border rounded-2xl">
          <p className="text-sm font-bold text-gray-700">
            配信総数: <span className="text-xl">{stats.length}件</span>
          </p>
          <p className="text-sm font-bold text-gray-700">
            総インプレッション数: <span className="text-xl text-blue-600">{stats.reduce((acc, s) => acc + (s.total_views || 0), 0)}回</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-2 italic">Issued on {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* --- 通常画面：ヘッダー --- */}
      <div className="flex justify-between items-center mb-6 no-print">
        <h1 className="text-xl font-bold text-gray-800 flex items-center">
          <span className="mr-2">📊</span> 配信成果レポート
        </h1>
        <button 
          onClick={handlePrint}
          className="bg-gray-900 text-white px-3 py-2 rounded-xl text-[10px] font-bold hover:bg-black transition shadow-md"
        >
          保存 / 印刷
        </button>
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-400 animate-pulse">データを集計中...</p>
      ) : (
        <div className="space-y-4">
          {stats.map((ad) => {
            const advice = getAdvice(ad.total_views || 0);
            return (
              <div key={ad.ad_id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden break-inside-avoid">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mb-1">
                        {ad.property_name} 配信分
                      </p>
                      <h2 className="font-bold text-gray-800 leading-tight">{ad.title}</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">閲覧数</p>
                      <p className="text-3xl font-black text-gray-800">{ad.total_views || 0}<span className="text-xs ml-1 font-normal text-gray-400">IMP</span></p>
                    </div>
                    <div className="text-center border-l border-gray-50 flex flex-col justify-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">最終閲覧</p>
                      <p className="text-[11px] mt-1 font-bold text-gray-600">
                        {ad.last_viewed_at ? new Date(ad.last_viewed_at).toLocaleDateString('ja-JP', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '---'}
                      </p>
                    </div>
                  </div>

                  {/* アドバイスセクション（no-printクラスで印刷時は非表示も可能） */}
                  <div className={`mt-4 p-3 rounded-2xl ${advice.bg} no-print`}>
                    <p className={`text-[10px] font-black mb-1 uppercase tracking-tighter ${advice.color}`}>DXアドバイス</p>
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
              <p className="text-sm text-gray-400 font-medium">配信データがありません</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 p-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl text-white shadow-xl no-print">
        <h3 className="font-bold text-sm mb-2">📈 ポスティングDXレポート</h3>
        <p className="text-[10px] leading-relaxed opacity-90">
          このデータは住民の生活動線に基づいたリアルタイムな数値です。
          紙のポスティングでは不可能な、正確な「視認数」を元に次の営業戦略を立てることが可能です。
        </p>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .max-w-md { max-width: 100% !important; width: 100% !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}