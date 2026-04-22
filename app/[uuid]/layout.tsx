// 3回戻って [uuid] フォルダの中の global.css を見に行く
import '../[uuid]/global.css'; 

export const metadata = {
  title: 'sumikea - 管理画面',
  description: 'ポスティング・運用管理コンソール',
}

export default function AdminRootLayout({
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