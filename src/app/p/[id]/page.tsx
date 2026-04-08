import { supabase } from '../../../lib/supabase/client';
import { notFound } from 'next/navigation';

export default async function PropertyPage({ params }: { params: { id: string } }) {
  // Supabaseから物件情報を取得
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .single();

  // エラーがあるか、物件が見つからない場合
  if (error || !property) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h1>物件が見つかりません</h1>
        <p>ID: {params.id}</p>
        <p style={{ color: 'red' }}>{error ? `詳細: ${error.message}` : ''}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
      <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        🏠 sumikea 反映テスト
      </h1>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        border: '1px solid #ccc', 
        borderRadius: '8px',
        backgroundColor: '#f9f9f9' 
      }}>
        <p><strong>物件名:</strong> {property.name}</p>
        <p><strong>住所:</strong> {property.address}</p>
        <p><strong>物件ID:</strong> {property.id}</p>
        <p><strong>郵便番号:</strong> {property.postal_code || '未登録'}</p>
      </div>

      <div style={{ marginTop: '20px', color: '#008000', fontWeight: 'bold' }}>
        ✅ Supabaseとの連携に成功しました！
      </div>

      <footer style={{ marginTop: '40px', fontSize: '12px', color: '#666' }}>
        © 2026 sumikea Project
      </footer>
    </div>
  );
}