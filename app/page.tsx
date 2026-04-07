export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';

/**
 * sumikea トップページ
 * エラー回避のため、複雑なライブラリ依存を排除したクリーンな構成です。
 */
export default async function IndexPage() {
  // 1. セッション（ログイン状態）を確認
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // 2. ログイン済みなら、プロフィールの物件IDを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('property_id')
      .eq('id', session.user.id)
      .single();

    if (profile?.property_id) {
      // 物件IDがあれば、そのページへ飛ばす
      redirect(`/rooms/${profile.property_id}`);
    }
  }

  // 3. 未ログイン時の表示
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white p-8 text-black">
      <div className="max-w-md w-full text-center space-y-10">
        <h1 className="text-5xl font-black text-blue-600 tracking-tighter">sumikea</h1>
        <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100">
          <p className="text-base text-gray-700 font-medium">
            物件専用ポータルへようこそ。
          </p>
        </div>
        <p className="text-[11px] text-gray-400 font-mono">
          URLを入力してアクセスしてください
        </p>
      </div>
    </main>
  );
}