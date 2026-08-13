"use client";

import { useState, useMemo } from "react";
import MapComponent from "@/components/MapComponent";
import Map3D from "@/components/Map3D";

type MapShellProps = {
  selectedLandmarkId: string;
  onSelectLandmark: (id: string) => void;
  selectedHouseId: string | null;
  onSelectHouse: (id: string | null) => void;
  thresholds?: { t1: number; t2: number; t3: number };
  poiSearchRadius?: number;
  showPoiRings?: boolean;
  orsApiKey?: string;
};

export default function MapShell({
  selectedLandmarkId,
  onSelectLandmark,
  selectedHouseId,
  onSelectHouse,
  thresholds,
  poiSearchRadius,
  showPoiRings,
  orsApiKey,
}: MapShellProps) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");

  const shared = useMemo(
    () => ({
      selectedLandmarkId,
      onSelectLandmark,
      selectedHouseId,
      onSelectHouse,
      thresholds,
      poiSearchRadius,
      showPoiRings,
      orsApiKey,
    }),
    [selectedLandmarkId, onSelectLandmark, selectedHouseId, onSelectHouse, thresholds, poiSearchRadius, showPoiRings, orsApiKey]
  );

  return (
    <div className="relative h-full w-full">
      {/* 2D / 3D toggle */}
      <div className="absolute right-3 top-16 z-[10000] flex items-center gap-2 rounded-lg border border-line bg-panel-2/90 p-1 shadow-md backdrop-blur md:left-1/2 md:top-3 md:-translate-x-1/2 md:right-auto">
        <button
          type="button"
          onClick={() => setMode("2d")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            mode === "2d" ? "bg-accent text-white" : "text-secondary hover:bg-hover-bg"
          }`}
        >
          2D
        </button>
        <button
          type="button"
          onClick={() => setMode("3d")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            mode === "3d" ? "bg-accent text-white" : "text-secondary hover:bg-hover-bg"
          }`}
        >
          3D
        </button>
      </div>

      {mode === "2d" ? <MapComponent {...shared} /> : <Map3D {...shared} />}
    </div>
  );
}
