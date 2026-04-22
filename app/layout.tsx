// app/layout.tsx の冒頭
import "./globals.css";

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
      {/* bodyタグにTailwindのクラスが入っているか確認してください */}
      <body className="antialiased bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  )
}