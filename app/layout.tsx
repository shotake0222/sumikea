import './globals.css'; // ← ★一番上で読み込んでいるか確認
import type { Metadata } from 'next';
// ...他のimport文

export const metadata: Metadata = {
  title: 'ぽすっと', // ← ★タイトルを更新
  description: '配信、即完了。',
};

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