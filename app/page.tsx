export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';

/**
 * sumikea Root Page
 * 依存ライブラリを最小限にし、ローカルビルドとVercelデプロイの両立を図ります。
 */
export default async function IndexPage() {
  // 1. セッション（ログイン状態）を確認
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    // 2. ログイン済みなら、ユーザーに紐付く物件IDを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('property_id')
      .eq('id', session.user.id)
      .single();

    if (profile?.property_id) {
      // 物件IDがあれば、そのページへ自動遷移
      redirect(`/rooms/${profile.property_id}`);
    }
  }

  // 3. 未ログイン、または物件未登録の場合の表示
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-black">
      <div className="max-w-sm w-full text-center space-y-6">
        <h1 className="text-4xl font-black text-blue-600 tracking-tighter">sumikea</h1>
        <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-sm leading-relaxed text-gray-600 font-medium">
            物件専用ポータルへようこそ。<br />
            配布されたQRコードからアクセスするか、<br />
            URLを直接入力してください。
          </p>
        </div>
        <p className="text-[10px] text-gray-300 font-mono">
          example: /rooms/036097d4-2c77-405f-8e17-fc584cbed0e0
        </p>
      </div>
    </main>
  );
}