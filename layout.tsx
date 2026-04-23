// app/[uuid]/layout.tsx
export default function PropertyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // CSSのインポートを削除し、親（RootLayout）に任せる
  return <>{children}</>;
}