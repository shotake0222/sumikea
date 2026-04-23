// src/app/layout.tsx

export const metadata = {
  title: 'ぽすっと',
  description: '配信、即完了。',
  // icons を空にするか、明示的に指定しない
  icons: {
    icon: [], 
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* head内にfaviconをリクエストさせる記述があれば削除 */}
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}