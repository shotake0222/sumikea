// app/[uuid]/page.tsx （新しく作るファイル）

import { notFound } from 'next/navigation';
import ResidentDashboard from './ResidentDashboardClient'; // さっき名前を変えたファイルを読み込む
import { supabase } from '../../../lib/supabase';

export default async function Page({ params }: { params: { uuid: string } }) {
  const { uuid } = params;

  // --- 💡ここで諸悪の根源 favicon.ico をシャットアウトします ---
  if (uuid === 'favicon.ico') {
    return null; 
  }

  // 1. URLのuuidを使って、データベースから物件情報を取得する
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('uuid', uuid)
    .single();

  // 物件が存在しない場合は404エラー画面を出す
  if (propError || !property) {
    notFound();
  }

  // 2. ゴミ出しデータの取得
  const { data: trashData } = await supabase
    .from('trash_schedules')
    .select('*')
    .eq('property_id', property.uuid);

  // 3. 周辺広告の取得
  const { data: localAds } = await supabase
    .from('ads')
    .select('*')
    .eq('property_id', property.uuid)
    .eq('is_active', true);

  // 取得したデータを、先ほどのクライアントコンポーネントに渡して画面に描画する
  return (
    <ResidentDashboard 
      property={property} 
      trashData={trashData || []} 
      localAds={localAds || []} 
    />
  );
}