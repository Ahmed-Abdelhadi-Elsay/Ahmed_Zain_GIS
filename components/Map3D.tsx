"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useAppSettings } from "@/components/AppSettingsProvider";
import {
  getDistanceMeters,
  distanceBandStyles,
  householdPoints,
  landmarks,
  pois,
} from "@/app/src/data/utrecht";
import { fetchBuildings, circlePolygon, type Building } from "@/app/src/data/buildings";

type Map3DProps = {
  selectedLandmarkId: string;
  onSelectLandmark: (id: string) => void;
  selectedHouseId: string | null;
  onSelectHouse: (id: string | null) => void;
  thresholds?: { t1: number; t2: number; t3: number };
  poiSearchRadius?: number;
  orsApiKey?: string;
};

const BBOX = { minLat: 52.084, minLng: 5.11, maxLat: 52.097, maxLng: 5.136 };
const CENTER: [number, number] = [5.1214, 52.0907];

function landmarkEmoji(category: string): string {
  const map: Record<string, string> = {
    "Historic landmark": "🗼",
    "Canal & culture": "🌊",
    Education: "🎓",
    Transport: "🚉",
    Hospital: "🏥",
  };
  return map[category] ?? "📍";
}

let buildingsCache: Building[] | null = null;

interface OverpassElement {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface IsochroneFeature {
  properties?: { value?: number };
  geometry?: GeoJSON.Geometry;
}

async function fetchFootRoute(
  apiKey: string,
  start: [number, number],
  end: [number, number]
): Promise<[number, number][] | null> {
  try {
    const res = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({
        coordinates: [
          [start[1], start[0]],
          [end[1], end[0]],
        ],
        format: "geojson",
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json?.features?.[0]?.geometry?.coordinates as number[][] | undefined;
    if (!raw || raw.length < 2) return null;
    return raw.map((c) => [c[1], c[0]] as [number, number]);
  } catch (error) {
    console.error("fetchFootRoute error:", error);
    return null;
  }
}

function fcOf(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features } as GeoJSON.FeatureCollection;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setSourceData(map: any, id: string, data: GeoJSON.FeatureCollection | GeoJSON.Feature) {
  try {
    const src = map.getSource(id);
    if (src && "setData" in src) {
      (src as unknown as { setData: (data: GeoJSON.FeatureCollection | GeoJSON.Feature) => void }).setData(data);
    }
  } catch {
    // ignore
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawBuildings(map: any, buildings: Building[], theme: string) {
  const dark = theme === "navy";
  const color = dark ? "#4b6a8f" : "#9db7d4";
  const features = buildings.map((b) => ({
    type: "Feature" as const,
    properties: { height: b.height, base: b.base, color },
    geometry: { type: "Polygon" as const, coordinates: [b.coords] },
  }));
  setSourceData(map, "buildings", fcOf(features));
}

async function fetchAndDrawPOIs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapInstance: any,
  selectedHouse: typeof householdPoints[0],
  poiSearchRadius: number,
  thresholds: { t1: number; t2: number; t3: number },
  orsApiKey?: string
) {
  try {
    const q = `[out:json];(node(around:${poiSearchRadius},${selectedHouse.lat},${selectedHouse.lng})[amenity~"restaurant|cafe|supermarket|hospital|university"];);out;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const json = await res.json();
    const elements = (json.elements || []) as OverpassElement[];
    const poisFound = elements
      .filter((el) => el.lat && el.lon)
      .map((el) => ({
        id: `osm-${el.id}`,
        name: (el.tags && (el.tags.name || el.tags.amenity)) || "POI",
        lat: el.lat,
        lng: el.lon,
        type: (el.tags && el.tags.amenity) || "unknown",
        distance: getDistanceMeters(selectedHouse.lat, selectedHouse.lng, el.lat, el.lon),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    const poiFeatures: GeoJSON.Feature[] = poisFound.map((p) => ({
      type: "Feature" as const,
      properties: {
        name: p.name,
        type: p.type,
        distance: p.distance,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [p.lng, p.lat],
      },
    }));
    setSourceData(mapInstance, "pois", fcOf(poiFeatures));

    if (orsApiKey) {
      try {
        const walkingSpeed = 1.4;
        const ranges = [thresholds.t1, thresholds.t2, thresholds.t3].map((m) =>
          Math.max(30, Math.round(m / walkingSpeed))
        );
        const isoRes = await fetch("https://api.openrouteservice.org/v2/isochrones/foot-walking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: orsApiKey,
          },
          body: JSON.stringify({ locations: [[selectedHouse.lng, selectedHouse.lat]], range: ranges }),
        });
        if (isoRes.ok) {
          const isoJson = await isoRes.json();
        }
      } catch (error) {
        console.warn("ORS isochrone fetch failed", error);
      }
    }
  } catch (error) {
    console.warn("Overpass fetch failed, falling back to embedded POIs", error);
    const poiFeatures: GeoJSON.Feature[] = pois.map((p) => ({
      type: "Feature" as const,
      properties: { name: p.name, type: p.type },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    }));
    setSourceData(mapInstance, "pois", fcOf(poiFeatures));
  }
}

export default function Map3D({
  selectedLandmarkId,
  onSelectLandmark,
  selectedHouseId,
  onSelectHouse,
  thresholds = { t1: 100, t2: 250, t3: 500 },
  poiSearchRadius = 500,
  orsApiKey,
}: Map3DProps) {
  const { theme } = useAppSettings();
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectLandmarkRef = useRef(onSelectLandmark);
  const onSelectHouseRef = useRef(onSelectHouse);

  useEffect(() => {
    onSelectLandmarkRef.current = onSelectLandmark;
  }, [onSelectLandmark]);

  useEffect(() => {
    onSelectHouseRef.current = onSelectHouse;
  }, [onSelectHouse]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const dark = theme === "navy";
    const basemapUrl = dark
      ? "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        center: CENTER,
        zoom: 15,
        pitch: 55,
        bearing: -35,
        antialias: true,
        style: {
          version: 8,
          sources: {
            basemap: {
              type: "raster",
              tiles: [basemapUrl],
              tileSize: 256,
              maxzoom: 19,
              attribution: "© OpenStreetMap contributors © CARTO",
            },
            buildings: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
            route: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
            pois: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
          },
          layers: [
            { id: "basemap", type: "raster", source: "basemap" },
            {
              id: "route-line",
              type: "line",
              source: "route",
              paint: { "line-color": "#f43f5e", "line-width": 4, "line-opacity": 0.95 },
            },
            {
              id: "pois-layer",
              type: "circle",
              source: "pois",
              paint: {
                "circle-radius": 6,
                "circle-color": "#7c3aed",
                "circle-opacity": 0.95,
                "circle-stroke-width": 1.2,
                "circle-stroke-color": "#7c3aed",
              },
            },
            {
              id: "buildings3d",
              type: "fill-extrusion",
              source: "buildings",
              paint: {
                "fill-extrusion-color": ["get", "color"],
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-base": ["get", "base"],
                "fill-extrusion-opacity": 0.9,
              },
            },
          ],
        },
        attributionControl: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    } catch (error) {
      console.error("Map3D failed to create map:", error);
      return;
    }

    mapRef.current = map;

    map.on("load", () => {
      if (buildingsCache) {
        drawBuildings(map, buildingsCache, theme);
      } else {
        fetchBuildings(BBOX).then((b) => {
          buildingsCache = b;
          if (mapRef.current) drawBuildings(mapRef.current, b, theme);
        }).catch((err) => {
          console.error("Map3D buildings fetch error:", err);
        });
      }
      try {
        map.resize();
      } catch {
        // ignore
      }

      map.on("click", "pois-layer", (e: maplibregl.MapLayerMouseEvent) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties as Record<string, unknown>;
        const name = (props?.name ?? "POI") as string;
        const type = (props?.type ?? "") as string;
        const distance = typeof props?.distance === "number" ? `${props.distance.toFixed(1)} m` : "";
        new maplibregl.Popup({ offset: 12 })
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${name}</strong><br/>${type}${distance ? `<br/>${distance}` : ""}`)
          .addTo(map);
      });

      map.on("mouseenter", "pois-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "pois-layer", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    map.on("error", (e: maplibregl.ErrorEvent) => {
      const err = (e as unknown as { error?: unknown })?.error;
      if (err && typeof err === "object" && (err as unknown as { status?: number }).status !== 404) {
        console.error("Map3D map error:", err);
      }
    });

    return () => {
      try {
        map.remove();
      } catch {
        // ignore
      }
      mapRef.current = null;
      markersRef.current = [];
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const src = map.getSource("basemap");
      if (src && "setTiles" in src) {
        (src as unknown as { setTiles: (tiles: string[]) => void }).setTiles([
          theme === "navy"
            ? "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"
            : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        ]);
      }
    } catch {
      // ignore
    }
    if (buildingsCache) drawBuildings(map, buildingsCache, theme);
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch {
        // ignore
      }
    });
    markersRef.current = [];

    const selected = landmarks.find((l) => l.id === selectedLandmarkId) ?? landmarks[0];
    const selectedHouse = householdPoints.find((h) => h.id === selectedHouseId) ?? null;

    landmarks.forEach((lm) => {
      const isSel = lm.id === selected.id;
      const el = document.createElement("div");
      el.className = "gis3d-marker";
      el.style.cssText = `width:${isSel ? 34 : 26}px;height:${isSel ? 34 : 26}px;display:flex;align-items:center;justify-content:center;font-size:${isSel ? 34 : 26}px;cursor:pointer;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));`;
      el.textContent = landmarkEmoji(lm.category);
      el.title = lm.name;

      const showLandmarkPopup = () => {
        if (popupRef.current) popupRef.current.remove();
        const popup = new maplibregl.Popup({ offset: 12, closeButton: true })
          .setLngLat([lm.lng, lm.lat])
          .setHTML(`<strong>${lm.name}</strong><br/><span style="opacity:0.8;">${lm.category}</span><br/><span style="font-size:12px;opacity:0.7;">${lm.description}</span>`)
          .addTo(map);
        popupRef.current = popup;
      };

      el.addEventListener("click", (evt) => {
        evt.stopPropagation();
        onSelectLandmarkRef.current(lm.id);
        showLandmarkPopup();
      });
      const m = new maplibregl.Marker({ element: el, anchor: "center", offset: [0, 0] })
        .setLngLat([lm.lng, lm.lat])
        .addTo(map);
      markersRef.current.push(m);
    });

    householdPoints.forEach((h) => {
      const distance = getDistanceMeters(selected.lat, selected.lng, h.lat, h.lng);
      const isSel = selectedHouse?.id === h.id;
      const band = distance <= thresholds.t1 ? "near" : distance <= thresholds.t2 ? "mid" : "far";
      const ringColor = isSel ? "#fde68a" : distanceBandStyles[band].color;
      const size = isSel ? 36 : 30;
      const el = document.createElement("div");
      el.style.cssText =
        `width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;` +
        `border-radius:50%;background:rgba(255,255,255,0.92);border:${isSel ? 3 : 2}px solid ${ringColor};` +
        `box-shadow:0 1px 4px rgba(0,0,0,0.35);font-size:${size - 12}px;line-height:1;cursor:pointer;`;
      el.textContent = "🏠";
      el.title = `${h.name} · ${distance.toFixed(1)} m from ${selected.name}`;

      const showHousePopup = () => {
        if (popupRef.current) popupRef.current.remove();
        const popup = new maplibregl.Popup({ offset: 12, closeButton: true })
          .setLngLat([h.lng, h.lat])
          .setHTML(`<strong>${h.name}</strong><br/><span style="font-size:12px;opacity:0.8;">${distance.toFixed(1)} m from ${selected.name}</span>`)
          .addTo(map);
        popupRef.current = popup;
      };

      el.addEventListener("click", (evt) => {
        evt.stopPropagation();
        onSelectHouseRef.current(h.id);
        showHousePopup();
        try {
          if (mapRef.current) mapRef.current.flyTo({ center: [h.lng, h.lat], zoom: 17, pitch: 55, duration: 1200 });
        } catch {
          // ignore
        }
      });
      const m = new maplibregl.Marker({ element: el, anchor: "center", offset: [0, 0] })
        .setLngLat([h.lng, h.lat])
        .addTo(map);
      markersRef.current.push(m);
    });

    const routeFeatures: GeoJSON.Feature[] = [];
    if (selectedHouse) {
      const start: [number, number] = [selectedHouse.lat, selectedHouse.lng];
      const end: [number, number] = [selected.lat, selected.lng];

      if (orsApiKey) {
        fetchFootRoute(orsApiKey, start, end).then((coords) => {
          if (!mapRef.current) return;
          const routeGeoJSON: GeoJSON.Feature[] = [];
          if (coords && coords.length >= 2) {
            routeGeoJSON.push({
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: coords.map((c) => [c[0], c[1]]),
              },
            });
          } else {
            routeGeoJSON.push({
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [
                  [selectedHouse.lng, selectedHouse.lat],
                  [selected.lng, selected.lat],
                ],
              },
            });
          }
          setSourceData(mapRef.current, "route", fcOf(routeGeoJSON));
        });
      } else {
        routeFeatures.push({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [selectedHouse.lng, selectedHouse.lat],
              [selected.lng, selected.lat],
            ],
          },
        });
      }
    }
    setSourceData(map, "route", fcOf(routeFeatures));

    if (selectedHouse) {
      fetchAndDrawPOIs(map, selectedHouse, poiSearchRadius, thresholds, orsApiKey);
    }
  }, [selectedLandmarkId, selectedHouseId, thresholds, poiSearchRadius, orsApiKey]);

  return (
    <div className="relative h-full w-full bg-panel">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
        3D Mode
      </div>
    </div>
  );
}
