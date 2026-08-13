"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// الإحداثيات الافتراضية للمنصورة
const centerPosition: [number, number] = [31.0409, 31.3785];

function LayerSwitcher() {
  const map = useMap();

  useEffect(() => {
    const basemaps = {
      "Road Map  (OpenStreetMap)": L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }
      ),
      "  Satellite Map (Esri Satellite)": L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        }
      ),
    };

    const control = L.control.layers(basemaps, undefined, { position: "topright" }).addTo(map);
    basemaps["Road Map  (OpenStreetMap)"].addTo(map);

    return () => {
      control.remove();
      Object.values(basemaps).forEach((layer) => layer.remove());
    };
  }, [map]);

  return null;
}

export default function MapComponent() {
  return (
    <MapContainer
      center={centerPosition}
      zoom={13}
      style={{ width: "100%", height: "100%" }}
    >
      <LayerSwitcher />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
    </MapContainer>
  );
}
