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
      <body className="antialiased">{children}</body>
    </html>
  );
}