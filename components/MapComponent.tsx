"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { useAppSettings } from "@/components/AppSettingsProvider";
import {
  getDistanceMeters,
  distanceBandStyles,
  householdPoints,
  landmarks,
  pois,
  housesWithinRadius,
} from "@/app/src/data/utrecht";

declare const L: any; // eslint-disable-line @typescript-eslint/no-explicit-any

type MapComponentProps = {
  selectedLandmarkId: string;
  onSelectLandmark: (id: string) => void;
  selectedHouseId: string | null;
  onSelectHouse: (id: string | null) => void;
  thresholds?: { t1: number; t2: number; t3: number };
  poiSearchRadius?: number;
  showPoiRings?: boolean;
  orsApiKey?: string;
};

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

export default function MapComponent({
  selectedLandmarkId,
  onSelectLandmark,
  selectedHouseId,
  onSelectHouse,
  thresholds = { t1: 10, t2: 100, t3: 500 },
  poiSearchRadius = 500,
  showPoiRings = true,
  orsApiKey,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const landmarkLayerRef = useRef<L.LayerGroup | null>(null);
  const houseLayerRef = useRef<L.LayerGroup | null>(null);
  const poiLayerRef = useRef<L.LayerGroup | null>(null);
  const poiRingsRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const lastFocusedLandmarkIdRef = useRef<string | null>(null);
  const routeGenerationRef = useRef(0);

  const { theme } = useAppSettings();

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      const L = await import("leaflet");

      if (!mapRef.current || !isMounted) return;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([52.0907, 5.1214], 15);

      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {
          // ignore
        }
      }, 200);

      mapInstanceRef.current = map;
      landmarkLayerRef.current = L.layerGroup().addTo(map);
      houseLayerRef.current = L.layerGroup().addTo(map);
      poiLayerRef.current = L.layerGroup().addTo(map);
      poiRingsRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);

      const dark = theme === "navy";

      const streetLayer = dark
        ? L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            {
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
            }
          )
        : L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          });

      const basemaps = {
        "Street Map (OpenStreetMap)": streetLayer,
        "Satellite Map (Esri)": L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
          }
        ),
      };

      streetLayer.addTo(map);
      L.control.layers(basemaps, undefined, { position: "topright" }).addTo(map);
    }

    void initMap();

    const initMarkers = () => {
      if (!isMounted) return;
      const map = mapInstanceRef.current;
      if (!map) return;

      const selected = landmarks.find((l) => l.id === selectedLandmarkId) ?? landmarks[0];
      const selectedHouse = householdPoints.find((h) => h.id === selectedHouseId) ?? null;

      landmarkLayerRef.current?.clearLayers();
      houseLayerRef.current?.clearLayers();
      poiLayerRef.current?.clearLayers();
      poiRingsRef.current?.clearLayers();
      routeLayerRef.current?.clearLayers();

      landmarks.forEach((landmark) => {
        const isSelected = landmark.id === selected.id;
        const icon = L.divIcon({
          className: "gis-icon",
          html: `<div style="font-size:${isSelected ? 34 : 26}px;line-height:34px;text-align:center;filter:${isSelected ? "drop-shadow(0 0 4px rgba(251,146,60,0.9))" : "drop-shadow(0 1px 2px rgba(0,0,0,0.5))"};">${landmarkEmoji(landmark.category)}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const markerInstance = L.marker([landmark.lat, landmark.lng], { icon });

        markerInstance.bindPopup(`<strong>${landmark.name}</strong><br />${landmark.description}`);
        markerInstance.bindTooltip(`<strong>${landmark.name}</strong><br/>${landmark.category}`, {
          direction: "top",
          offset: [0, -18],
        });
        markerInstance.on("click", () => onSelectLandmark(landmark.id));
        markerInstance.addTo(landmarkLayerRef.current!);
      });

      const housesWithin10 = selectedHouse
        ? housesWithinRadius(selectedHouse.lat, selectedHouse.lng, 10).map((h) => h.id)
        : [];

      householdPoints.forEach((house) => {
        const distance = getDistanceMeters(selected.lat, selected.lng, house.lat, house.lng);
        const isSelected = selectedHouse?.id === house.id;
        const isNearToSelectedHouse = housesWithin10.includes(house.id);
        const band = distance <= thresholds.t1 ? "near" : distance <= thresholds.t2 ? "mid" : "far";
        const style = distanceBandStyles[band];

        const ringColor = isSelected ? "#fde68a" : isNearToSelectedHouse ? "#16a34a" : style.color;
        const size = isSelected ? 36 : 30;
        const icon = L.divIcon({
          className: "gis-icon",
          html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,0.92);border:${isSelected ? 3 : 2}px solid ${ringColor};box-shadow:0 1px 4px rgba(0,0,0,0.35);font-size:${size - 12}px;line-height:1;">🏠</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        const markerInstance = L.marker([house.lat, house.lng], { icon });

        markerInstance.bindTooltip(
          `<div style="text-align:center;min-width:130px;line-height:1.5;">
             <strong style="font-size:13px;">${house.name}</strong>
             <div style="font-size:12px;font-weight:600;margin-top:2px;">${distance.toFixed(1)} m</div>
             <div style="font-size:11px;opacity:0.75;">from ${selected.name}</div>
           </div>`,
          { direction: "top", offset: [0, -(size / 2 + 8)], opacity: 1, sticky: true }
        );

        markerInstance.on("click", () => {
          try {
            onSelectHouse(house.id);
          } catch (error) {
            console.error(error);
          }
          try {
            markerInstance.openTooltip();
          } catch {
            // ignore
          }
          try {
            map.flyTo([house.lat, house.lng], 17, { duration: 0.6 });
          } catch {
            // ignore
          }
        });

        markerInstance.on("mouseover", () => {
          try {
            markerInstance.openTooltip();
          } catch {
            // ignore
          }
        });

        markerInstance.addTo(houseLayerRef.current!);

        if (house.id === selectedHouse?.id) {
          try {
            markerInstance.openTooltip();
          } catch {
            // ignore
          }
        }
      });

      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {
          // ignore
        }
      }, 150);
    };

    const initTimeout = setTimeout(initMarkers, 250);

    return () => {
      clearTimeout(initTimeout);
      isMounted = false;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [theme]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const selected = landmarks.find((l) => l.id === selectedLandmarkId) ?? landmarks[0];
    const selectedHouse = householdPoints.find((h) => h.id === selectedHouseId) ?? null;

    landmarkLayerRef.current?.clearLayers();
    houseLayerRef.current?.clearLayers();
    poiLayerRef.current?.clearLayers();
    poiRingsRef.current?.clearLayers();
    routeLayerRef.current?.clearLayers();

    landmarks.forEach((landmark) => {
      const isSelected = landmark.id === selected.id;
      const icon = L.divIcon({
        className: "gis-icon",
        html: `<div style="font-size:${isSelected ? 34 : 26}px;line-height:34px;text-align:center;filter:${isSelected ? "drop-shadow(0 0 4px rgba(251,146,60,0.9))" : "drop-shadow(0 1px 2px rgba(0,0,0,0.5))"};">${landmarkEmoji(landmark.category)}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const markerInstance = L.marker([landmark.lat, landmark.lng], { icon });

      markerInstance.bindPopup(`<strong>${landmark.name}</strong><br />${landmark.description}`);
      markerInstance.bindTooltip(`<strong>${landmark.name}</strong><br/>${landmark.category}`, {
        direction: "top",
        offset: [0, -18],
      });
      markerInstance.on("click", () => onSelectLandmark(landmark.id));
      markerInstance.addTo(landmarkLayerRef.current!);
    });

    const housesWithin10 = selectedHouse
      ? housesWithinRadius(selectedHouse.lat, selectedHouse.lng, 10).map((h) => h.id)
      : [];

    householdPoints.forEach((house) => {
      const distance = getDistanceMeters(selected.lat, selected.lng, house.lat, house.lng);
      const isSelected = selectedHouse?.id === house.id;
      const isNearToSelectedHouse = housesWithin10.includes(house.id);
      const band = distance <= thresholds.t1 ? "near" : distance <= thresholds.t2 ? "mid" : "far";
      const style = distanceBandStyles[band];

      const ringColor = isSelected ? "#fde68a" : isNearToSelectedHouse ? "#16a34a" : style.color;
      const size = isSelected ? 36 : 30;
      const icon = L.divIcon({
        className: "gis-icon",
        html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,0.92);border:${isSelected ? 3 : 2}px solid ${ringColor};box-shadow:0 1px 4px rgba(0,0,0,0.35);font-size:${size - 12}px;line-height:1;">🏠</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const markerInstance = L.marker([house.lat, house.lng], { icon });

      markerInstance.bindTooltip(
        `<div style="text-align:center;min-width:130px;line-height:1.5;">
           <strong style="font-size:13px;">${house.name}</strong>
           <div style="font-size:12px;font-weight:600;margin-top:2px;">${distance.toFixed(1)} m</div>
           <div style="font-size:11px;opacity:0.75;">from ${selected.name}</div>
         </div>`,
        { direction: "top", offset: [0, -(size / 2 + 8)], opacity: 1, sticky: true }
      );

      markerInstance.on("click", () => {
        try {
          onSelectHouse(house.id);
        } catch (error) {
          console.error(error);
        }
        try {
          markerInstance.openTooltip();
        } catch {
          // ignore
        }
        try {
          map.flyTo([house.lat, house.lng], 17, { duration: 0.6 });
        } catch {
          // ignore
        }
      });

      markerInstance.on("mouseover", () => {
        try {
          markerInstance.openTooltip();
        } catch {
          // ignore
        }
      });

      markerInstance.addTo(houseLayerRef.current!);

      if (house.id === selectedHouse?.id) {
        try {
          markerInstance.openTooltip();
        } catch {
          // ignore
        }
      }
    });

    async function fetchAndDrawPOIs(mapInstance: L.Map) {
      if (!selectedHouse) return;

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

        poisFound.forEach((p, idx) => {
          const poiMarker = L.circleMarker([p.lat, p.lng], {
            radius: idx === 0 ? 9 : 6,
            color: idx === 0 ? "#b45309" : "#7c3aed",
            fillColor: idx === 0 ? "#fcd34d" : "#a78bfa",
            fillOpacity: 0.95,
            weight: idx === 0 ? 2.4 : 1.2,
          });
          poiMarker.bindPopup(`<strong>${p.name}</strong><br/>${p.type}<br/>${p.distance.toFixed(1)} m`);
          poiMarker.on("click", () => {
            try {
              poiMarker.openPopup();
            } catch {
              // ignore
            }
            try {
              mapInstance.flyTo([p.lat, p.lng], 18, { duration: 0.6 });
            } catch {
              // ignore
            }
          });
          poiMarker.addTo(poiLayerRef.current!);

          if (showPoiRings) {
            const rings = [
              { r: thresholds.t1, color: "#16a34a", fillOpacity: 0.14 },
              { r: thresholds.t2, color: "#f59e0b", fillOpacity: 0.10 },
              { r: thresholds.t3, color: "#ef4444", fillOpacity: 0.07 },
            ];
            rings.forEach((ring) => {
              L.circle([p.lat, p.lng], {
                radius: ring.r,
                color: null,
                fillColor: ring.color,
                fillOpacity: ring.fillOpacity,
                weight: 0,
              }).addTo(poiRingsRef.current!);
            });
          }
        });

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
              (isoJson.features || []).forEach((feat: IsochroneFeature) => {
                const range = feat.properties?.value ?? 0;
                let color = "#16a34a";
                if (range >= ranges[2]) color = "#ef4444";
                else if (range >= ranges[1]) color = "#f59e0b";
                if (feat.geometry) {
                  L.geoJSON(feat.geometry, {
                    style: { color, fillColor: color, fillOpacity: 0.08, weight: 1.2 },
                  }).addTo(poiRingsRef.current!);
                }
              });
            }
          } catch (error) {
            console.warn("ORS isochrone fetch failed", error);
          }
        }
      } catch (error) {
        console.warn("Overpass fetch failed, falling back to embedded POIs", error);
        pois.forEach((p) => {
          const poiMarker = L.circleMarker([p.lat, p.lng], {
            radius: 5,
            color: "#9ca3af",
            fillColor: "#c7d2fe",
            fillOpacity: 0.8,
            weight: 1,
          });
          poiMarker.bindPopup(`<strong>${p.name}</strong><br/>${p.type}`);
          poiMarker.addTo(poiLayerRef.current!);
        });
      }
    }

    void fetchAndDrawPOIs(map);

    if (routeLayerRef.current) routeLayerRef.current.clearLayers();
    if (selectedHouse) {
      const gen = ++routeGenerationRef.current;
      const start: [number, number] = [selectedHouse.lat, selectedHouse.lng];
      const end: [number, number] = [selected.lat, selected.lng];
      const straightDistance = getDistanceMeters(start[0], start[1], end[0], end[1]);

      const drawStraight = () => {
        if (!routeLayerRef.current || gen !== routeGenerationRef.current) return;
        try {
          const line = L.polyline([start, end], {
            color: "#f43f5e",
            weight: 3,
            dashArray: "6 8",
            opacity: 0.9,
          });
          line.bindTooltip(
            `${selectedHouse.name} → ${selected.name} · ${straightDistance.toFixed(0)} m (straight line)`,
            { sticky: true }
          );
          line.addTo(routeLayerRef.current);
          L.circleMarker(start, { radius: 6, color: "#f43f5e", fillColor: "#f43f5e", fillOpacity: 1 }).addTo(
            routeLayerRef.current
          );
          L.circleMarker(end, { radius: 6, color: "#f43f5e", fillColor: "#f43f5e", fillOpacity: 1 }).addTo(
            routeLayerRef.current
          );
        } catch {
          // ignore
        }
      };

      if (orsApiKey) {
        fetchFootRoute(orsApiKey, start, end).then((coords) => {
          if (!routeLayerRef.current || gen !== routeGenerationRef.current) return;
          if (!coords || coords.length < 2) {
            drawStraight();
            return;
          }
          try {
            let len = 0;
            for (let i = 1; i < coords.length; i++)
              len += getDistanceMeters(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
            const line = L.polyline(coords, { color: "#f43f5e", weight: 4, opacity: 0.95 });
            line.bindTooltip(`${selectedHouse.name} → ${selected.name} · ${len.toFixed(0)} m`, { sticky: true });
            line.addTo(routeLayerRef.current);
          } catch {
            drawStraight();
          }
        });
      } else {
        drawStraight();
      }
    }

    if (lastFocusedLandmarkIdRef.current !== selectedLandmarkId) {
      map.flyTo([selected.lat, selected.lng], 16, { duration: 0.8 });
      lastFocusedLandmarkIdRef.current = selectedLandmarkId;
    }
  }, [
    selectedLandmarkId,
    selectedHouseId,
    onSelectLandmark,
    onSelectHouse,
    thresholds,
    poiSearchRadius,
    showPoiRings,
    orsApiKey,
  ]);

  return (
    <div ref={mapRef} className="relative h-full w-full">
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
        2D Mode
      </div>
    </div>
  );
}
