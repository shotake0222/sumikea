// src/app/layout.tsx
import './globals.css' // 必要に応じて

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
      <body>{children}</body>
    </html>
  )
}

