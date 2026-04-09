import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // 1. 物件情報、2. ゴミ出し、3. お知らせ を同時に取得
  const [propRes, trashRes, newsRes] = await Promise.all([
    supabase.from('properties').select('*').eq('id', id).single(),
    supabase.from('trash_schedules').select('*').eq('property_id', id).order('day_of_week'),
    supabase.from('announcements').select('*').eq('property_id', id).order('created_at', { ascending: false })
  ]);

  const property = propRes.data;
  const trashSchedules = trashRes.data || [];
  const announcements = newsRes.data || [];

  if (!property) return <div style={{ padding: '20px' }}>物件が見つかりません</div>;

  const dayMap = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <header style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>🏠 {property.name}</h1>
        <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#666' }}>{property.address}</p>
      </header>

      {/* ゴミ出しセクション */}
      <section style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1rem', borderLeft: '4px solid #3b82f6', paddingLeft: '10px', marginBottom: '15px' }}>ゴミ出しカレンダー</h2>
        {trashSchedules.length > 0 ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {trashSchedules.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                <span style={{ fontWeight: 'bold' }}>{dayMap[t.day_of_week]}曜日</span>
                <span>{t.category}</span>
              </div>
            ))}
          </div>
        ) : <p>登録がありません</p>}
      </section>

      {/* お知らせセクション */}
      <section style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '15px' }}>
        <h2 style={{ fontSize: '1rem', borderLeft: '4px solid #ef4444', paddingLeft: '10px', marginBottom: '15px' }}>管理会社からのお知らせ</h2>
        {announcements.map((a) => (
          <div key={a.id} style={{ marginBottom: '15px', padding: '10px', backgroundColor: a.is_important ? '#fff5f5' : 'transparent', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '0.9rem', margin: '0 0 5px' }}>{a.is_important && '⚠️ '}{a.title}</h3>
            <p style={{ fontSize: '0.8rem', color: '#444', margin: 0 }}>{a.content}</p>
          </div>
        ))}
      </section>
    </div>
  );
}