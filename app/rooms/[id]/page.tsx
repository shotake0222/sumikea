export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';

export default async function RoomPage({ params }: { params: { id: string } }) {
  try {
    // 1. まずIDが届いているかチェック
    if (!params.id) {
      return <div className="p-10 text-black">エラー: URLにIDが含まれていません。</div>;
    }

    // 2. Supabaseからデータを取る（ここが怪しい）
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('name, address')
      .eq('id', params.id)
      .single();

    // 3. Supabaseがエラーを返した場合、その中身を表示
    if (propError) {
      return (
        <div className="p-10 text-red-600 bg-white min-h-screen">
          <h1 className="font-bold text-xl">Supabaseがエラーを返しました</h1>
          <p className="mt-2 text-sm">Message: {propError.message}</p>
          <p className="text-xs text-gray-400">Code: {propError.code}</p>
          <p className="text-xs text-gray-400">Hint: {propError.hint}</p>
          <hr className="my-4" />
          <p className="text-black text-xs">アクセスしようとしたID: {params.id}</p>
        </div>
      );
    }

    // 4. データが取れた場合
    return (
      <div className="p-10 text-black bg-white min-h-screen">
        <h1 className="text-2xl font-bold text-green-600">接続成功！</h1>
        <p className="mt-4">物件名: {property?.name}</p>
        <p className="text-sm text-gray-500">住所: {property?.address}</p>
      </div>
    );

  } catch (err: any) {
    // 5. プログラム自体がクラッシュした場合
    return (
      <div className="p-10 text-orange-600 bg-white min-h-screen">
        <h1 className="font-bold text-xl">プログラム実行エラー</h1>
        <pre className="mt-4 text-xs bg-gray-100 p-4 overflow-auto">
          {err.message || "Unknown error"}
        </pre>
      </div>
    );
  }
}