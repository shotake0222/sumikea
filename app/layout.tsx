import './globals.css';
import { Metadata } from 'next';

// 500エラーの原因となる自動リクエストを徹底的に抑制
export const metadata: Metadata = {
  title: 'ぽすっと',
  description: '配信、即完了。',
  icons: {
    // 空配列ではなく、nullまたは明示的なパス指定を行うことで
    // Next.jsが「faviconを探しにいく」暴走を止めます
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
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
        {/* 1. CDNの警告を消すため、deferを付与。
          2. これによりJSの実行順序が安定し、ハイドレーションエラーを防ぎます。
        */}
        <script 
          src="https://cdn.tailwindcss.com" 
          defer
        ></script>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}