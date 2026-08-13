"use client";

import { useState, useCallback } from "react";
import MapShell from "./MapShell";
import Dashboard from "../components/Dashboard";
import { householdPoints, landmarks } from "./src/data/utrecht";

export default function Home() {
  const [selectedLandmarkId, setSelectedLandmarkId] = useState(landmarks[0].id);
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);

  const [thresholds, setThresholds] = useState({ t1: 100, t2: 250, t3: 500 });
  const [poiSearchRadius, setPoiSearchRadius] = useState(500);
  const [showPoiRings, setShowPoiRings] = useState(true);
  const [orsApiKey, setOrsApiKey] = useState<string>("");

  const selectedLandmark = landmarks.find((item) => item.id === selectedLandmarkId) ?? landmarks[0];
  const selectedHouse = householdPoints.find((item) => item.id === selectedHouseId) ?? null;

  const handleSelectLandmark = useCallback((id: string) => {
    setSelectedLandmarkId(id);
  }, []);
  const handleSelectHouse = useCallback((id: string | null) => {
    setSelectedHouseId(id);
  }, []);

  return (
    <main className="min-h-screen bg-background p-4 text-foreground">
      <div className="grid h-[calc(100vh-2rem)] grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Dashboard
          selectedLandmark={selectedLandmark}
          onSelectLandmark={handleSelectLandmark}
          selectedHouse={selectedHouse}
          onSelectHouse={handleSelectHouse}
          thresholds={thresholds}
          setThresholds={setThresholds}
          poiSearchRadius={poiSearchRadius}
          setPoiSearchRadius={setPoiSearchRadius}
          showPoiRings={showPoiRings}
          setShowPoiRings={setShowPoiRings}
          orsApiKey={orsApiKey}
          setOrsApiKey={setOrsApiKey}
        />
        <div className="min-h-[56vh] lg:min-h-0 h-full overflow-hidden rounded-3xl border border-line bg-panel shadow-2xl shadow-black/30">
          <MapShell
            selectedLandmarkId={selectedLandmarkId}
            onSelectLandmark={handleSelectLandmark}
            selectedHouseId={selectedHouseId}
            onSelectHouse={handleSelectHouse}
            thresholds={thresholds}
            poiSearchRadius={poiSearchRadius}
            showPoiRings={showPoiRings}
            orsApiKey={orsApiKey}
          />
        </div>
      </div>

      {selectedHouse ? (
        <div className="fixed right-4 top-4 z-50 rounded-lg border border-line-2 bg-panel-2/90 px-4 py-2 text-sm text-foreground shadow-lg">
          <div className="flex items-center gap-3">
            <div>
              <div className="font-semibold">Selected house</div>
              <div className="text-secondary">{selectedHouse.name}</div>
            </div>
            <button
              onClick={() => setSelectedHouseId(null)}
              className="ml-4 rounded bg-hover-bg px-2 py-1 text-xs hover:opacity-80"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
