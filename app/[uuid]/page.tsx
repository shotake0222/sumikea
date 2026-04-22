import { supabase } from '../../lib/supabase';
import { notFound } from 'next/navigation';
import ResidentDashboardClient from '../../components/ResidentDashboardClient'; // 新規作成するクライアント側

interface Props {
  params: { uuid: string };
}

export default async function ResidentDashboard({ params }: Props) {
  const { uuid } = params;

  // 1. 物件情報取得
  const { data: property, error: pError } = await supabase
    .from('properties')
    .select('*')
    .eq('uuid', uuid)
    .single();

  if (pError || !property || uuid === 'undefined') notFound();

  // 2. 関連データ取得
  const [trashData, announcementData, adsData, externalAdsRes] = await Promise.all([
    supabase.from('trash_schedules').select('*').eq('property_id', property.uuid),
    supabase.from('announcements').select('*').eq('property_id', property.uuid).order('created_at', { ascending: false }),
    supabase.from('local_ads').select('*').eq('property_id', property.uuid).limit(10),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/properties/${property.uuid}/external-info`, { next: { revalidate: 3600 } })
      .then(res => res.ok ? res.json() : [])
      .catch(() => [])
  ]);

  const localAds = (adsData.data || []).map(ad => ({ ...ad, isExternal: false }));
  
  // 3. クライアントコンポーネントへ受け渡し
  return (
    <ResidentDashboardClient 
      property={property}
      trashData={trashData.data || []}
      announcements={announcementData.data || []}
      localAds={localAds}
      externalAds={externalAdsRes}
    />
  );
}

