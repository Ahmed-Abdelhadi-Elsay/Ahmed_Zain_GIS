"use client";

import {
  type HouseholdPoint,
  getDistanceMeters,
  distanceBandStyles,
  householdPoints,
  landmarks,
  storySteps,
  getNearestPOIs,
} from "@/app/src/data/utrecht";

type DashboardProps = {
  selectedLandmark: (typeof landmarks)[number];
  onSelectLandmark: (id: string) => void;
  selectedHouse: HouseholdPoint | null;
  onSelectHouse: (id: string | null) => void;
  thresholds: { t1: number; t2: number; t3: number };
  setThresholds: (t: { t1: number; t2: number; t3: number }) => void;
  poiSearchRadius: number;
  setPoiSearchRadius: (n: number) => void;
  showPoiRings: boolean;
  setShowPoiRings: (v: boolean) => void;
  orsApiKey: string;
  setOrsApiKey: (k: string) => void;
};

import { useAppSettings } from '@/components/AppSettingsProvider';

export default function Dashboard({ selectedLandmark, onSelectLandmark, selectedHouse, onSelectHouse, thresholds, setThresholds, poiSearchRadius, setPoiSearchRadius, showPoiRings, setShowPoiRings, orsApiKey, setOrsApiKey }: DashboardProps) {
  const { lang } = useAppSettings();

  const distanceSummary = householdPoints.reduce(
    (acc, house) => {
      const distance = getDistanceMeters(selectedLandmark.lat, selectedLandmark.lng, house.lat, house.lng);
      if (distance <= thresholds.t1) acc.near += 1;
      else if (distance <= thresholds.t2) acc.mid += 1;
      else acc.far += 1;
      return acc;
    },
    { near: 0, mid: 0, far: 0 }
  );

  const ttext: Record<string, Record<string, string>> = {
    en: {
      city: 'Utrecht city center',
      title: 'GIS Dashboard',
      analysis: 'Proximity analysis',
      live: 'Live',
      selected_landmark: 'Selected landmark',
      selected_household: 'Selected house',
      clear: 'Clear',
      distance_from: 'Distance from',
      nearby_amenities: 'Nearby amenities',
      click_house: 'Click a house on the map to view details.',
      explore: 'Explore',
      nearby_houses: 'Houses',
      points_of_interest: 'Landmarks',
      thresholds: 'Distance thresholds (m)',
      poi_radius: 'POI search radius',
      show_rings: 'Show POI rings',
      ors_key: 'ORS API key (optional)',
      ors_hint: 'Enables walking isochrones on the 3D map.',
    },
    ar: {
      city: 'مركز مدينة أوترخت',
      title: 'لوحة المعلومات الجغرافية',
      analysis: 'تحليل التقارب',
      live: 'مباشر',
      selected_landmark: 'المعلم المحدد',
      selected_household: 'المنزل المحدد',
      clear: 'مسح',
      distance_from: 'المسافة من',
      nearby_amenities: 'المرافق القريبة',
      click_house: 'اضغط على بيت في الخريطة لعرض التفاصيل.',
      explore: 'استكشاف',
      nearby_houses: 'المنازل',
      points_of_interest: 'المعالم',
      thresholds: 'حدود المسافة (متر)',
      poi_radius: 'نطاق بحث المرافق',
      show_rings: 'إظهار حلقات المرافق',
      ors_key: 'مفتاح ORS API (اختياري)',
      ors_hint: 'يفعل خطوط المسافة المشي على الخريطة ثلاثية الأبعاد.',
    },
  };

  const tx = ttext[lang || 'en'];

  return (
    <aside dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`flex flex-col overflow-auto rounded-3xl border border-line bg-panel/90 p-6 shadow-2xl shadow-black/30 max-h-[calc(100vh-2rem)] ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-accent">{tx.city}</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{tx.title}</h1>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-foreground">{tx.points_of_interest}</p>
        <div className="mt-3 space-y-2">
          {landmarks.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectLandmark(item.id)}
              className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                selectedLandmark.id === item.id
                  ? 'border-accent bg-accent/15 text-foreground'
                  : 'border-line bg-panel-2/70 text-secondary hover:border-line-2'
              }`}
            >
              <div className="font-semibold">{item.name}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.25em] text-muted">{item.category}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-panel-2/70 p-4">
        <p className="text-sm font-semibold text-foreground">{tx.selected_landmark}</p>
        <h2 className="mt-2 text-xl font-semibold text-accent">{selectedLandmark.name}</h2>
        <p className="mt-2 text-sm text-muted">{selectedLandmark.description}</p>
        <p className="mt-3 text-sm text-secondary">{selectedLandmark.highlight}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-panel-2/70 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{tx.analysis}</p>
          <span className="rounded-full border border-line-2 bg-panel-3/80 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-muted">
            {tx.live}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {[
            { key: 'near', label: `≤ ${thresholds.t1} m`, count: distanceSummary.near, color: distanceBandStyles.near.color },
            { key: 'mid', label: `≤ ${thresholds.t2} m`, count: distanceSummary.mid, color: distanceBandStyles.mid.color },
            { key: 'far', label: `> ${thresholds.t2} m`, count: distanceSummary.far, color: distanceBandStyles.far.color },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-xl border border-line bg-panel-2/70 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full`} style={{ background: item.color }} />
                <span className="text-secondary">{item.label}</span>
              </div>
              <span className="font-semibold text-foreground">{item.count} houses</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="text-xs text-muted">{tx.thresholds}</div>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                value={thresholds.t1}
                onChange={(e) => setThresholds({ ...thresholds, t1: Number(e.target.value) })}
                className="w-1/3 rounded-md border bg-input-bg px-2 py-1 text-sm text-foreground"
              />
              <input
                type="number"
                value={thresholds.t2}
                onChange={(e) => setThresholds({ ...thresholds, t2: Number(e.target.value) })}
                className="w-1/3 rounded-md border bg-input-bg px-2 py-1 text-sm text-foreground"
              />
              <input
                type="number"
                value={thresholds.t3}
                onChange={(e) => setThresholds({ ...thresholds, t3: Number(e.target.value) })}
                className="w-1/3 rounded-md border bg-input-bg px-2 py-1 text-sm text-foreground"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted">{tx.poi_radius}</div>
              <div className="text-xs text-muted">{poiSearchRadius} m</div>
            </div>
            <input
              type="range"
              min={100}
              max={3000}
              step={50}
              value={poiSearchRadius}
              onChange={(e) => setPoiSearchRadius(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showPoiRings} onChange={(e) => setShowPoiRings(e.target.checked)} />
            <span className="text-sm text-secondary">{tx.show_rings}</span>
          </label>

          <div>
            <div className="text-xs text-muted">{tx.ors_key}</div>
            <input
              type="text"
              placeholder="Paste ORS API key"
              value={orsApiKey}
              onChange={(e) => setOrsApiKey(e.target.value)}
              className="mt-1 w-full rounded-md border bg-input-bg px-2 py-1 text-sm text-foreground"
            />
            <div className="mt-1 text-xs text-muted">{tx.ors_hint}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-panel-2/70 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{tx.selected_household}</p>
          <button
            type="button"
            onClick={() => onSelectHouse(null)}
            className="text-xs text-muted transition hover:text-foreground"
          >
            {tx.clear}
          </button>
        </div>
        {selectedHouse ? (
          <>
            <h3 className="mt-2 text-lg font-semibold text-accent">{selectedHouse.name}</h3>
            <p className="mt-2 text-sm text-muted">{selectedHouse.description}</p>
            <div className="mt-3 rounded-xl border border-line bg-panel-2/70 p-3 text-sm text-secondary">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">{tx.distance_from} {selectedLandmark.name}</p>
              {selectedHouse && (
                <>
                  {(() => {
                    const d = getDistanceMeters(selectedLandmark.lat, selectedLandmark.lng, selectedHouse.lat, selectedHouse.lng);
                    const lbl = d <= thresholds.t1 ? `≤ ${thresholds.t1} m` : d <= thresholds.t2 ? `≤ ${thresholds.t2} m` : `> ${thresholds.t2} m`;
                    return (
                      <>
                        <p className="mt-1 text-base font-semibold text-foreground">{d.toFixed(1)} m</p>
                        <p className="mt-1 text-sm text-muted">{lbl}</p>
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-foreground">{tx.nearby_amenities}</p>
              <div className="mt-2 space-y-2">
                {getNearestPOIs(selectedHouse.lat, selectedHouse.lng, 5).map((poi) => (
                  <div key={poi.id} className="rounded-md border border-line bg-panel-2/70 p-2 text-sm flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{poi.name}</div>
                      <div className="text-xs text-muted">{poi.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{poi.distance.toFixed(1)} m</div>
                      <div className="text-xs text-muted">nearest</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">{tx.click_house}</p>
        )}
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-foreground">{tx.explore}</p>
        <div className="mt-3 space-y-2">
          {storySteps.map((step, index) => (
            <div key={step} className="rounded-xl border border-line bg-panel-2/70 p-3 text-sm text-secondary">
              <span className="mr-2 text-accent">0{index + 1}</span>
              {step}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-foreground">{tx.nearby_houses}</p>
        <div className="mt-3 space-y-2">
          {householdPoints.map((house) => {
            const distance = getDistanceMeters(selectedLandmark.lat, selectedLandmark.lng, house.lat, house.lng);
            const isSelected = selectedHouse?.id === house.id;
            const band = distance <= thresholds.t1 ? 'near' : distance <= thresholds.t2 ? 'mid' : 'far';
            const color = distanceBandStyles[band].color;
            const label = band === 'near' ? `≤ ${thresholds.t1} m` : band === 'mid' ? `≤ ${thresholds.t2} m` : `> ${thresholds.t2} m`;
            return (
              <button
                key={house.id}
                type="button"
                onClick={() => onSelectHouse(house.id)}
                className={`w-full rounded-xl border p-3 text-left text-sm transition flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-accent bg-accent/15 text-foreground'
                    : 'border-line bg-panel-2/70 text-secondary hover:border-line-2'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                  <div>
                    <div className="font-semibold">{house.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.25em] text-muted">{house.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{distance.toFixed(1)} m</div>
                  <div className="text-xs text-muted">{label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
