import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const propertyId = params.id

  // 1. キャッシュの確認 (1日以内のデータがあればそれを返す)
  const { data: cache } = await supabase
    .from('external_ads_cache')
    .select('*')
    .eq('property_id', propertyId)
    .gt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .single()

  if (cache) return NextResponse.json(cache.content)

  // 2. 物件の座標を取得
  const { data: property } = await supabase
    .from('properties')
    .select('location') // 緯度経度
    .eq('id', propertyId)
    .single()

  // 3. Google Places API 呼び出し (周辺のスーパー/ドラッグストアを検索)
  const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${property.location}&radius=500&type=supermarket&key=${process.env.GOOGLE_MAPS_API_KEY}`
  const res = await fetch(googleUrl)
  const googleData = await res.json()

  const simplifiedData = googleData.results.map((place: any) => ({
    name: place.name,
    address: place.vicinity,
    place_id: place.place_id,
    source: 'google'
  }))

  // 4. キャッシュに保存して返却
  await supabase.from('external_ads_cache').upsert({
    property_id: propertyId,
    content: simplifiedData,
    updated_at: new Date().toISOString()
  })

  return NextResponse.json(simplifiedData)
}