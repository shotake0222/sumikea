export async function getNearbyStores(lat: number, lng: number) {
  const query = `
    [out:json];
    (
      node["shop"~"supermarket|convenience"](around:800, ${lat}, ${lng});
      node["amenity"~"restaurant|cafe|fast_food"](around:800, ${lat}, ${lng});
    );
    out body;
  `;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.elements.map((item: any) => ({
      name: item.tags.name || "不明な店舗",
      type: item.tags.shop || item.tags.amenity,
    })).slice(0, 5); // 上位5件
  } catch (e) {
    return [];
  }
}