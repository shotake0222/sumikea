export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';

/**
 * sumikea Root Page
 * ログイン状態をチェックし、適切な物件ページへ誘導します
 */
export default async function Index() {
  // 1. セッション（ログイン状態）を確認
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (session && !sessionError) {
    // 2. ログイン済みなら、ユーザーに紐付く物件IDを取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('property_id')
      .eq('id', session.user.id)
      .single();

    if (profile?.property_id) {
      // 紐付けられた物件ページへリダイレクト
      return redirect(`/rooms/${profile.property_id}`);
    }
  }

  // 3. 未ログイン、または物件未登録の場合のメイン画面
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-black">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-blue-600 tracking-tighter">sumikea</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Resident Portal Service</p>
        </div>
        
        <div className="py-8 px-6 bg-gray-50 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-sm leading-relaxed text-gray-600 font-medium">
            物件専用ポータルへようこそ。<br />
            配布されたQRコードからアクセスするか、<br />
            正しいURLを直接入力してください。
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-gray-300 font-mono">Example Path:</p>
          <p className="text-[10px] text-gray-400 font-mono bg-gray-50 py-1 rounded">
            /rooms/036097d4-2c77-405f-8e17-fc584cbed0e0
          </p>
        </div>
      </div>
    </main>
  );
}