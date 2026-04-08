export const metadata = {
  title: 'sumikea',
  description: '物件単位の生活インフラプラットフォーム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}