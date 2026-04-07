export async function getNearbyStores(lat: number, lng: number) {
  // 半径500m以内のスーパー、コンビニ、飲食店を取得するクエリ
  const query = `
    [out:json];
    (
      node["shop"~"supermarket|convenience"](around:500, ${lat}, ${lng});
      node["amenity"~"restaurant|cafe|fast_food"](around:500, ${lat}, ${lng});
    );
    out body;
  `;
  
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // 必要なデータ（名前と位置）だけを抽出して返す
    return data.elements.map((item: any) => ({
      name: item.tags.name || "不明な店舗",
      type: item.tags.shop || item.tags.amenity,
      lat: item.lat,
      lng: item.lon
    }));
  } catch (error) {
    console.error("OSMデータ取得失敗:", error);
    return [];
  }
}