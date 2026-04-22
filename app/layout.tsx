// app/layout.tsx
// sがあるかないか、両方試せるように一応 sなしを推奨します（画像でそう見えたため）
import "./[uuid]/global.css"; 

export const metadata = {
  title: 'sumikea',
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