/** @type {import('next').NextConfig} */
const nextConfig = {
  // favicon.ico へのリクエストが [uuid] に流れるのを物理的に遮断する
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/favicon.ico',
      },
    ];
  },
  // 念のため、古いパスへのリダイレクトが残っていないか確認
  // (もし以前リダイレクト設定を書いていたら、ここを空にする)
};

export default nextConfig;