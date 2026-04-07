// @/lib/supabase が一番確実ですが、もしエラーが出るなら直接 ./../../../lib/supabase にします
import { supabase } from '@/lib/supabase'

export default async function RoomPage(props: any) {
  // Next.js 15の仕様変更（paramsの非同期化）に対応
  const params = await props.params;
  const id = params.id;

  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !property) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>物件が見つかりません</h1>
        <p>ID: {id}</p>
        <p>エラー詳細: {error?.message}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{property.name}</h1>
      <p style={{ color: '#666' }}>{property.address}</p>
      <hr style={{ margin: '20px 0' }} />
      <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '18px' }}>ゴミ出しスケジュール</h2>
        <pre>{JSON.stringify(property.trash_schedule, null, 2)}</pre>
      </div>
    </div>
  )
}