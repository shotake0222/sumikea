// app/[uuid]/layout.tsx
import "./globals.css"; // 's' を付けて再試行

export default function PropertyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}