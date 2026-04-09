import { supabase } from './client'; // 同じ場所から呼ぶ

export default async function TestPage() {
  const { data } = await supabase.from('properties').select('name').limit(1);
  return (
    <pre>{JSON.stringify(data, null, 2)}</pre>
  );
}