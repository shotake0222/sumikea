export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const propertyId = params.id;

  // 1. キャッシュ確認（24時間以内）
  const { data: cache } = await supabase
    .from('external_ads_cache')
    .select('*')
    .eq('property_id', propertyId)
    .gt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .single();

  if (cache) return NextResponse.json(cache.content);

  // 2. 物件の緯度経度を取得
  const { data: property } = await supabase
    .from('properties')
    .select('location_lat, location_lng')
    .eq('id', propertyId)
    .single();

  if (!property) return NextResponse.json([]);

  // 3. Google Places API 呼び出し
  // ※VercelのEnvironment Variablesに GOOGLE_MAPS_API_KEY を追加してください
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${property.location_lat},${property.location_lng}&radius=1000&type=supermarket&key=${apiKey}`;
  
  const res = await fetch(url);
  const googleData = await res.json();

  const results = googleData.results?.slice(0, 5).map((place: any) => ({
    name: place.name,
    address: place.vicinity,
    place_id: place.place_id,
    source: 'google'
  })) || [];

  // 4. キャッシュ保存
  await supabase.from('external_ads_cache').upsert({
    property_id: propertyId,
    content: results,
    updated_at: new Date().toISOString()
  });

  return NextResponse.json(results);
}
