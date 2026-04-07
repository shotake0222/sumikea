import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export default async function RoomPage({ params }: { params: { id: string } }) {
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !property) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">物件が見つかりません</h1>
        <p className="mt-2 text-gray-600">ID: {params.id}</p>
      </div>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <header className="bg-blue-600 text-white p-6 shadow-md">
        <h1 className="text-2xl font-bold">{property.name}</h1>
        <p className="text-sm opacity-90 mt-1">{property.address}</p>
      </header>

      <div className="p-4 space-y-6">
        {/* セクション1：ゴミ出し (OCR/手入力反映用) */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-3 flex items-center">
            📅 ゴミ出しスケジュール
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm text-center">
            <div className="bg-orange-50 p-2 rounded text-orange-700">可燃：月・木</div>
            <div className="bg-blue-50 p-2 rounded text-blue-700">不燃：第1・3水</div>
            <div className="bg-green-50 p-2 rounded text-green-700">資源：金</div>
            <div className="bg-gray-50 p-2 rounded text-gray-500">プラ：火</div>
          </div>
        </section>

        {/* セクション2：お知らせ (管理者ページ連携用) */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-2">📢 管理会社からのお知らせ</h2>
          <div className="text-sm text-gray-600 border-l-4 border-blue-500 pl-3 py-1">
            <p className="font-semibold text-gray-800">4/15 排水管清掃のお知らせ</p>
            <p className="text-xs">当日は9:00〜12:00まで断水となります。</p>
          </div>
        </section>

        {/* セクション3：周辺店舗 (Google Maps API連携用) */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-2">🛒 周辺のお得情報</h2>
          <p className="text-xs text-gray-400 mb-3">※Google Mapsより自動取得</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="font-bold text-sm">スーパー・ライフ</p>
                <p className="text-xs text-gray-500">徒歩3分 / チラシあり</p>
              </div>
              <button className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">チラシ</button>
            </div>
          </div>
        </section>
      </div>

      {/* フッターナビ（住人・店舗・管理者への切り替えイメージ） */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t p-3 flex justify-around text-[10px] text-gray-400">
        <div className="text-blue-600 font-bold">住民</div>
        <div>店舗</div>
        <div>管理会社</div>
        <div>運営</div>
      </nav>
    </main>
  );
}