export type Landmark = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  category: string;
  highlight: string;
};

export type HouseholdPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  category: string;
};

export const landmarks: Landmark[] = [
  {
    id: 'dom-tower',
    name: 'Dom Tower',
    lat: 52.0907,
    lng: 5.1214,
    description: 'The iconic landmark of Utrecht and one of the tallest church towers in the Netherlands.',
    category: 'Historic landmark',
    highlight: 'Best viewpoint over the city center',
  },
  {
    id: 'oudegracht',
    name: 'Oudegracht',
    lat: 52.0902,
    lng: 5.1216,
    description: 'The famous canal with wharf houses, cafés, and the vibrant heart of historic Utrecht.',
    category: 'Canal & culture',
    highlight: 'A lively corridor of shops and restaurants',
  },
  {
    id: 'university',
    name: 'Utrecht University',
    lat: 52.0904604,
    lng: 5.1233895,
    description: 'Universiteit Utrecht — main city campus and hubs around the Domplein area.',
    category: 'Education',
    highlight: 'Central university campus and faculties',
  },
  {
    id: 'central-station',
    name: 'Utrecht Central Station',
    lat: 52.0894,
    lng: 5.1094,
    description: 'The gateway to Utrecht with strong transportation links and a dynamic urban atmosphere.',
    category: 'Transport',
    highlight: 'Connects the city center to the wider region',
  },
  {
    id: 'van-der-hoeven-kliniek',
    name: 'Van der Hoeven Kliniek',
    lat: 52.1054922,
    lng: 5.1132559,
    description: 'Specialist hospital / clinic (Forensische Zorg Specialisten).',
    category: 'Hospital',
    highlight: 'Specialist care & emergency services',
  },
];

export const householdPoints: HouseholdPoint[] = [
  { id: 'house-01', name: 'House 01', lat: 52.0909, lng: 5.1217, description: 'A compact residential building close to the canal corridor.', category: 'Residential' },
  { id: 'house-02', name: 'House 02', lat: 52.0906, lng: 5.1212, description: 'A mixed-use property with strong pedestrian access.', category: 'Mixed-use' },
  { id: 'house-03', name: 'House 03', lat: 52.0903, lng: 5.1219, description: 'A small family home within easy walking distance of the city center.', category: 'Residential' },
  { id: 'house-04', name: 'House 04', lat: 52.0901, lng: 5.1208, description: 'A heritage-style residence near the market area.', category: 'Heritage' },
  { id: 'house-05', name: 'House 05', lat: 52.0897, lng: 5.1198, description: 'An apartment block that benefits from nearby transit.', category: 'Apartment' },
  { id: 'house-06', name: 'House 06', lat: 52.0895, lng: 5.1229, description: 'A modern townhouse along a quieter street.', category: 'Residential' },
  { id: 'house-07', name: 'House 07', lat: 52.0891, lng: 5.1213, description: 'A student-friendly residence close to the university zone.', category: 'Student housing' },
  { id: 'house-08', name: 'House 08', lat: 52.0887, lng: 5.1189, description: 'A detached home near the edge of the core pedestrian network.', category: 'Residential' },
];

export const distanceBandStyles = {
  near: { label: '≤ 10 m', color: '#22c55e', textColor: 'text-emerald-300' },
  mid: { label: '≤ 100 m', color: '#facc15', textColor: 'text-amber-300' },
  far: { label: '> 100 m', color: '#ef4444', textColor: 'text-rose-300' },
} as const;

export function getDistanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;

  const latDelta = toRad(toLat - fromLat);
  const lngDelta = toRad(toLng - fromLng);
  const fromLatRad = toRad(fromLat);
  const toLatRad = toRad(toLat);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLatRad) * Math.cos(toLatRad) * Math.sin(lngDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

export function getDistanceBand(selectedLandmark: Landmark, house: HouseholdPoint) {
  const distance = getDistanceMeters(selectedLandmark.lat, selectedLandmark.lng, house.lat, house.lng);

  if (distance <= 10) {
    return { band: 'near' as const, distance, ...distanceBandStyles.near };
  }

  if (distance <= 100) {
    return { band: 'mid' as const, distance, ...distanceBandStyles.mid };
  }

  return { band: 'far' as const, distance, ...distanceBandStyles.far };
}

// Points of Interest (amenities) sample data — restaurants, supermarkets, cafes
export type POI = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'restaurant' | 'supermarket' | 'cafe' | 'shop';
};

export const pois: POI[] = [
  { id: 'poi-de-vingerhoed', name: 'De Vingerhoed', lat: 52.0898173, lng: 5.1209929, type: 'cafe' },
  { id: 'poi-west', name: 'West (restaurant)', lat: 52.0940606, lng: 5.0932982, type: 'restaurant' },
  { id: 'poi-cafe-lombok', name: 'Café Lombok', lat: 52.0931656, lng: 5.0968016, type: 'cafe' },
  { id: 'poi-spaghetteria', name: 'Spaghetteria', lat: 52.0952096, lng: 5.1266853, type: 'restaurant' },
  { id: 'poi-ulu', name: 'Ulu', lat: 52.0952147, lng: 5.1229368, type: 'restaurant' },
  { id: 'poi-paloma', name: 'Paloma', lat: 52.0900796, lng: 5.1170841, type: 'restaurant' },
  { id: 'poi-hartlooper', name: 'Louis Hartloopercomplex', lat: 52.0816957, lng: 5.1242627, type: 'restaurant' },
  { id: 'poi-winkelvansinkel', name: 'Winkel van Sinkel', lat: 52.0919332, lng: 5.1186673, type: 'restaurant' },
  { id: 'poi-streetfood', name: 'The Streetfood Club', lat: 52.0929931, lng: 5.1221528, type: 'cafe' },
  { id: 'poi-oudaen', name: 'Kasteel Oudaen', lat: 52.0927486, lng: 5.1166435, type: 'restaurant' },
  { id: 'poi-hemel-aarde', name: 'Hemel & Aarde', lat: 52.0924708, lng: 5.1229586, type: 'restaurant' },
  { id: 'poi-saffraan', name: 'Saffraan', lat: 52.0917601, lng: 5.1178941, type: 'restaurant' },
  { id: 'poi-the5th', name: 'The 5th', lat: 52.0933303, lng: 5.1190375, type: 'restaurant' },
  { id: 'poi-kafenion', name: 'Kafenion', lat: 52.0919211, lng: 5.1203312, type: 'cafe' },
  { id: 'poi-twintig', name: 'Twintig', lat: 52.0923470, lng: 5.1194562, type: 'restaurant' },
];

export function getNearestPOIs(lat: number, lng: number, maxResults = 5) {
  return pois
    .map((p) => ({
      poi: p,
      distance: getDistanceMeters(lat, lng, p.lat, p.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults)
    .map((r) => ({ ...r.poi, distance: r.distance }));
}

export function housesWithinRadius(lat: number, lng: number, radiusMeters = 10) {
  return householdPoints
    .map((h) => ({ house: h, distance: getDistanceMeters(lat, lng, h.lat, h.lng) }))
    .filter((r) => r.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance)
    .map((r) => ({ ...r.house, distance: r.distance }));
}

export const storySteps = [
  'Explore the heart of Utrecht through a guided city-centre narrative.',
  'Understand how the historic canals and monumental buildings shape walkability.',
  'Compare landmarks and see how accessible each one is on foot.',
  'Use the dashboard to explore the city center from a spatial analytics perspective.',
];

export const summaryMetrics = [
  { label: 'Landmarks', value: '4' },
  { label: 'Accessibility rings', value: '3' },
  { label: '3D city model', value: 'Ready' },
];
