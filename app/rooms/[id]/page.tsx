import { supabase } from '../../lib/supabase'

export default async function RoomPage(props: any) {
  // Next.js 15対策: paramsをawaitする
  const params = await props.params;
  const id = params.id;

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()

  if (!property) return <div>物件が見つかりません (ID: {id})</div>

  return (
    <div style={{ padding: '20px' }}>
      <h1>{property.name}</h1>
      <p>{property.address}</p>
      <hr />
      <pre>{JSON.stringify(property.trash_schedule, null, 2)}</pre>
    </div>
  )
}