/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // 型エラーを無視してビルドする
  },
  eslint: {
    ignoreDuringBuilds: true, // 構文チェックを無視してビルドする
  },
}

module.exports = nextConfig