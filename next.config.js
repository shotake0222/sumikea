/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ビルド時のTypeScriptエラーを完全に無視する
    ignoreBuildErrors: true,
  },
  eslint: {
    // ビルド時のESLintエラー（構文チェック）を完全に無視する
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig