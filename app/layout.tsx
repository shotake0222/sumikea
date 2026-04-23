import './globals.css';

export const metadata = {
  title: 'ぽすっと',
  description: '配信、即完了。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* これを追記：ビルドエラーを無視してブラウザで強制的にTailwindを当てる */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}