export const metadata = {
  title: '賃貸コンシェルジュ',
  description: '物件ごとの専用ポータルサイト',
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