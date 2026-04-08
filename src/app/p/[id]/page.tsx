import { supabase } from '@/lib/supabase/client';
import { notFound } from 'next/navigation';

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !property) {
    return <div>物件が見つかりません: {params.id}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🏠 sumikea 反映テスト</h1>
      <div className="border p-4 rounded-lg shadow">
        <p><strong>物件名:</strong> {property.name}</p>
        <p><strong>住所:</strong> {property.address}</p>
        <p><strong>ID:</strong> {property.id}</p>
      </div>
      <p className="mt-4 text-green-600">✅ Supabaseからのデータ取得に成功しました！</p>
    </div>
  );
}