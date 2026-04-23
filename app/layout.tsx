import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ぽすっと',
  description: '配信、即完了。',
  icons: {
    icon: '/favicon.ico', // faviconのリクエストを明示的にルートへ向ける
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* 注意: productionビルドでのエラーを避けるため、
          本来は tailwind.config.ts を使うべきですが、
          現状のまま強制適用させるためのCDNは残しつつ、
          Next.jsのハイドレーションと干渉しにくい位置に配置します。
        */}
        <script src="https://cdn.tailwindcss.com" async></script>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}