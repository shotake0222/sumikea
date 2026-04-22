// app/layout.tsx
import "./globals.css"; // さっき作ったファイルを指定

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
<<<<<<< HEAD
      {/* デザインを適用させるために className を追加 */}
      <body className="antialiased bg-slate-50 text-slate-800">
=======
      <body>
>>>>>>> ebbc55d77547c3c0c71aba2ba13202882e04ceed
        {children}
      </body>
    </html>
  );
}