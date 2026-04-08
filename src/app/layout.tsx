// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // もしCSSファイルがあるなら。無ければ削除してOK

export const metadata: Metadata = {
  title: "sumikea",
  description: "物件単位の生活インフラプラットフォーム",
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