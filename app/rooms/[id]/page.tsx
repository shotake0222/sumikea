import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export default async function RoomPage({ params }: { params: { id: string } }) {
  // 1. まず物件情報だけを取得して接続テスト
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !property) {
    console.error("Supabase Error:", error);
    return notFound();
  }

  return (
    <main className="p-10 text-black bg-white min-h-screen">
      <h1 className="text-2xl font-bold">接続テスト成功</h1>
      <p className="mt-4">物件名: {property.name}</p>
      <p className="text-sm text-gray-500">ID: {params.id}</p>
      
      <div className="mt-8 p-4 bg-green-50 text-green-700 rounded border border-green-200">
        もしこの画面が見えたら、DB接続は正常です。500エラーの原因は「外部API(OSM)」か「Middleware」にあります。
      </div>
    </main>
  );
}