import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-md mx-auto p-8 min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-3xl font-extrabold text-blue-600 mb-2">sumikea</h1>
      <p className="text-gray-500 mb-8 text-center">物件単位の生活インフラ情報アプリ</p>
      
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