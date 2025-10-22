"use client";

import { useMemo, useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import type { FacilityOption, Filters } from "@/lib/types";

type PersoaneRange = { min: number; max: number };

type FilterSidebarProps = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  minPrice: number;
  maxPrice: number;
  persoaneRange: PersoaneRange;
  resetFiltre: () => void;
  facilitiesList: FacilityOption[];
  resultsCount?: number;
  showActiveChips?: boolean;
};

const Range = Slider.Range;

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  setFilters,
  minPrice,
  maxPrice,
  persoaneRange,
  resetFiltre,
  facilitiesList,
  resultsCount,
  showActiveChips = true,
}) => {
  // 🔧 doar aici schimbăm: start closed + căutare
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
  const [facilityQuery, setFacilityQuery] = useState("");
  // how many facilities to show when collapsed
  const FACILITIES_COLLAPSED_COUNT = 3;

  const hasActiveFilters =
    filters.pretMin > minPrice ||
    filters.pretMax < maxPrice ||
    filters.persoaneMin > persoaneRange.min ||
    filters.persoaneMax < persoaneRange.max ||
    filters.facilities.length > 0 ||
    filters.keyword.trim().length > 0;

  const toggleFacility = (id: string, checked: boolean) => {
    setFilters((prev) => {
      const updated = checked
        ? [...prev.facilities, id]
        : prev.facilities.filter((f) => f !== id);
      return { ...prev, facilities: updated };
    });
  };

  const clearKeyword = () => {
    setFilters((prev) => ({ ...prev, keyword: "", locatie: "" }));
  };

  const clearFacilities = () => {
    if (filters.facilities.length === 0) return;
    setFilters((prev) => ({ ...prev, facilities: [] }));
  };

  // listă filtrată (evit refacerea filtrării în JSX)
  const filteredFacilities = useMemo(() => {
    const q = facilityQuery.trim().toLowerCase();
    if (!q) return facilitiesList;
    return facilitiesList.filter((f) => f.name.toLowerCase().includes(q));
  }, [facilityQuery, facilitiesList]);

  return (
  <section className="w-full rounded-2xl bg-white p-2 pb-0 -mb-6 dark:bg-zinc-900/70">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {typeof resultsCount === "number" && (
            <span className="block text-sm text-gray-600 dark:text-gray-400">
              {resultsCount} proprietăți
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={resetFiltre}
              className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-zinc-600 dark:text-gray-200 dark:hover:bg-zinc-800"
            >
              Resetează filtrele
            </button>
          )}
        </div>
      </div>

      {showActiveChips && hasActiveFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {filters.keyword.trim() && (
            <button
              aria-label={`Șterge căutarea: ${filters.keyword}`}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30"
              onClick={clearKeyword}
            >
              <span>{filters.keyword}</span>
              <span aria-hidden="true">×</span>
              <span className="sr-only">Șterge căutarea</span>
            </button>
          )}

          {(filters.pretMin > minPrice || filters.pretMax < maxPrice) && (
            <button
              aria-label={`Resetează preț: ${filters.pretMin} - ${filters.pretMax} lei`}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30"
              onClick={() => setFilters((prev) => ({ ...prev, pretMin: minPrice, pretMax: maxPrice }))}
            >
              <span>
                Preț: {filters.pretMin} - {filters.pretMax} lei
              </span>
              <span aria-hidden="true">×</span>
              <span className="sr-only">Resetează prețul</span>
            </button>
          )}

          {(filters.persoaneMin > persoaneRange.min || filters.persoaneMax < persoaneRange.max) && (
            <button
              aria-label={`Resetează persoane: ${filters.persoaneMin} - ${filters.persoaneMax}`}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  persoaneMin: persoaneRange.min,
                  persoaneMax: persoaneRange.max,
                }))
              }
            >
              <span>
                Persoane: {filters.persoaneMin} - {filters.persoaneMax}
              </span>
              <span aria-hidden="true">×</span>
              <span className="sr-only">Resetează numărul de persoane</span>
            </button>
          )}

          {filters.facilities.map((facilityId) => {
            const facility = facilitiesList.find((f) => f.id === facilityId);
            if (!facility) return null;
              return (
              <button
                key={facilityId}
                aria-label={`Elimină facilitate: ${facility.name}`}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30"
                onClick={() => toggleFacility(facilityId, false)}
              >
                <span>{facility.name}</span>
                <span aria-hidden="true">×</span>
                <span className="sr-only">Elimină {facility.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* === CONTROALE EXISTENTE: Preț & Persoane (nemodificate) === */}
  <div className="mt-1 grid gap-2 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
  <div className="rounded-xl p-1 dark:bg-zinc-900/60">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Interval preț (lei / noapte)</h4>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="number"
              className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100"
              value={filters.pretMin}
              min={minPrice}
              max={filters.pretMax}
              onChange={(e) => {
                const v = Math.max(minPrice, Math.min(Number(e.target.value || 0), filters.pretMax));
                setFilters((prev) => ({ ...prev, pretMin: v }));
              }}
              aria-label="Preț minim"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
            <input
              type="number"
              className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100"
              value={filters.pretMax}
              min={filters.pretMin}
              max={maxPrice}
              onChange={(e) => {
                const v = Math.min(maxPrice, Math.max(Number(e.target.value || 0), filters.pretMin));
                setFilters((prev) => ({ ...prev, pretMax: v }));
              }}
              aria-label="Preț maxim"
            />
          </div>
          <div className="mt-3">
            <Range className="compact-range"
              min={minPrice}
              max={maxPrice}
              step={10}
              value={[filters.pretMin, filters.pretMax]}
              allowCross={false}
              pushable={10}
              onChange={([pretMin, pretMax]) => setFilters((prev) => ({ ...prev, pretMin, pretMax }))}
            />
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {filters.pretMin} lei - {filters.pretMax} lei
          </p>
        </div>

  <div className="rounded-xl p-1 dark:bg-zinc-900/60">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Număr persoane</h4>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="number"
              className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100"
              value={filters.persoaneMin}
              min={persoaneRange.min}
              max={filters.persoaneMax}
              onChange={(e) => {
                const v = Math.max(persoaneRange.min, Math.min(Number(e.target.value || 0), filters.persoaneMax));
                setFilters((prev) => ({ ...prev, persoaneMin: v }));
              }}
              aria-label="Număr minim persoane"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
            <input
              type="number"
              className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100"
              value={filters.persoaneMax}
              min={filters.persoaneMin}
              max={persoaneRange.max}
              onChange={(e) => {
                const v = Math.min(persoaneRange.max, Math.max(Number(e.target.value || 0), filters.persoaneMin));
                setFilters((prev) => ({ ...prev, persoaneMax: v }));
              }}
              aria-label="Număr maxim persoane"
            />
          </div>
          <div className="mt-3">
            <Range className="compact-range"
              min={persoaneRange.min}
              max={persoaneRange.max}
              step={1}
              value={[filters.persoaneMin, filters.persoaneMax]}
              allowCross={false}
              pushable={1}
              onChange={([persoaneMin, persoaneMax]) =>
                setFilters((prev) => ({ ...prev, persoaneMin, persoaneMax }))
              }
            />
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {filters.persoaneMin} - {filters.persoaneMax} persoane
          </p>
        </div>

  <div className="rounded-xl p-1 dark:bg-zinc-900/60">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setFacilitiesOpen((v) => !v)}
            aria-expanded={facilitiesOpen}
            aria-controls="facilities-panel"
          >
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Facilități</span>

            <span className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              {filters.facilities.length > 0 ? `${filters.facilities.length} selectate` : "niciuna"}
              <svg
                className={`h-4 w-4 transition-transform ${facilitiesOpen ? "rotate-180" : "rotate-0"}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.086l3.71-3.856a.75.75 0 111.08 1.04l-4.24 4.41a.75.75 0 01-1.08 0l-4.24-4.41a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </button>

          <div id="facilities-panel" className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={facilityQuery}
                onChange={(e) => setFacilityQuery(e.target.value)}
                placeholder="Caută facilități..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100"
              />
              {filters.facilities.length > 0 && (
                <button
                  onClick={clearFacilities}
                  className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-zinc-600 dark:text-gray-200 dark:hover:bg-zinc-800"
                >
                  Șterge tot
                </button>
              )}
            </div>
            <div className="relative">
              {/* scroll area: collapsed by default (small maxHeight) and expands when facilitiesOpen */}
              <div className="pr-1">
                  {/* collapsed: show only a few items; expanded: show all */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-1">
                    {(facilitiesOpen ? filteredFacilities : filteredFacilities.slice(0, FACILITIES_COLLAPSED_COUNT)).map((facility) => {
                      const checked = filters.facilities.includes(facility.id);
                      return (
                        <label
                          key={facility.id}
                          className={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm transition ${
                            checked
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                              : "border-transparent hover:border-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 dark:text-gray-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-3 w-3 rounded border-2 border-gray-300 accent-emerald-600 dark:border-zinc-600"
                            checked={checked}
                            onChange={(e) => toggleFacility(facility.id, e.target.checked)}
                          />
                          <span className="truncate">{facility.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

              {/* show 'Arată mai multe' when collapsed and there are more items */}
              {!facilitiesOpen && filteredFacilities.length > FACILITIES_COLLAPSED_COUNT && (
                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={() => setFacilitiesOpen(true)}
                    className="text-sm font-medium text-emerald-600 hover:underline"
                  >
                    Arată mai multe
                  </button>
                </div>
              )}

              {facilitiesOpen && filteredFacilities.length > FACILITIES_COLLAPSED_COUNT && (
                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={() => setFacilitiesOpen(false)}
                    className="text-sm font-medium text-gray-600 hover:underline"
                  >
                    Arată mai puține
                  </button>
                </div>
              )}

              {filteredFacilities.length === 0 && (
                <p className="pt-2 text-sm text-gray-500 dark:text-gray-400">Nicio facilitate găsită.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FilterSidebar;
