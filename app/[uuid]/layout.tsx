// app/[uuid]/layout.tsx
import "./global.css"; // 同じフォルダにあるので "./" でOK

export default function PropertyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // <html> や <body> はルート（app/layout.tsx）に任せるので、中身だけにします
  return <>{children}</>;
}