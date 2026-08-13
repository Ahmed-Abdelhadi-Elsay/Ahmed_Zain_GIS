export type Building = {
  coords: number[][]; // [lng, lat][] ring
  height: number;
  base: number;
};

export type BBox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

const cache = new Map<string, Building[]>();

// Fetch building footprints around a bounding box from the OpenStreetMap Overpass API.
export async function fetchBuildings(bbox: BBox): Promise<Building[]> {
  const key = `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const q = `[out:json][timeout:25];(way["building"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}););out geom;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const json = await res.json();
    const elements = json.elements || [];

    const buildings: Building[] = [];
    for (const el of elements) {
      const geom = el.geometry;
      if (!geom || geom.length < 4) continue;
      const coords = geom.map((g: { lon: number; lat: number }) => [g.lon, g.lat]);
      const tags = el.tags || {};
      const levels = parseFloat(tags["building:levels"]) || 0;
      const heightFromTag = parseFloat(tags.height) || 0;
      const height =
        heightFromTag ||
        (levels > 0 ? levels * 3.2 : tags.building === "house" ? 7 : tags.building === "garage" ? 4 : 10);
      buildings.push({ coords, height, base: 0 });
    }

    cache.set(key, buildings);
    return buildings;
  } catch (error) {
    console.error("fetchBuildings error:", error);
    return [];
  }
}

// Generate a circle polygon (in [lng, lat]) around a point for the accessibility rings.
export function circlePolygon(lat: number, lng: number, radiusMeters: number, segments = 40): number[][] {
  const R = 6371000;
  const dLat = (radiusMeters / R) * (180 / Math.PI);
  const dLng = (radiusMeters / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
  const pts: number[][] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    pts.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  pts.push(pts[0]);
  return pts;
}