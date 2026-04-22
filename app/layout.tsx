import './globals.css'; // この1行が抜けていたため、デザインが適用されていませんでした

export const metadata = {
  title: 'sumikea - 住民ダッシュボード',
  description: '物件単位の生活インフラ情報アプリ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="antialiased text-slate-800 bg-slate-50">
        {children}
      </body>
    </html>
  )
}