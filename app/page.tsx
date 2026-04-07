export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';

/**
 * sumikea Root Page
 * ユーザーのセッション状態を確認し、紐付けられた物件へ自動転送します。
 * ビルドエラー回避のため、標準的な supabase クライアントのみを使用します。
 */
export default async function IndexPage() {
  // 1. ログインセッションの取得
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // 2. ログイン済みの場合、プロフィールの物件IDを確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('property_id')
      .eq('id', session.user.id)
      .single();

    if (profile?.property_id) {
      // 物件IDが見つかれば、その専用ページへリダイレクト
      redirect(`/rooms/${profile.property_id}`);
    }
  }

  // 3. 未ログイン、または物件未登録時のランディング表示
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white p-8 text-black">
      <div className="max-w-md w-full text-center space-y-10">
        <div className="space-y-3">
          <h1 className="text-5xl font-black text-blue-600 tracking-tighter">sumikea</h1>
          <div className="h-1 w-12 bg-blue-600 mx-auto rounded-full"></div>
        </div>
        
        <div className="bg-gray-50 rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
          <p className="text-base leading-relaxed text-gray-700 font-medium">
            物件専用ポータルへようこそ。<br />
            配布されたQRコードからアクセスするか、<br />
            正しいURLを入力してください。
          </p>
        </div>

        <div className="pt-4">
          <p className="text-[10px] text-gray-300 font-mono uppercase tracking-widest mb-2">Example URL</p>
          <code className="text-[11px] text-gray-400 font-mono bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
            /rooms/036097d4-2c77-405f-8e17-fc584cbed0e0
          </code>
        </div>
      </div>
    </main>
  );
}