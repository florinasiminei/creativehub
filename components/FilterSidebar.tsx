import React, { useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

type PersoaneRange = { min: number; max: number };
type Facility = { id: string; name: string };

type Filters = {
  locatie: string;
  keyword: string;
  pretMin: number;
  pretMax: number;
  facilities: string[];
  persoaneMin: number;
  persoaneMax: number;
};

type FilterSidebarProps = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  minPrice: number;
  maxPrice: number;
  persoaneRange: PersoaneRange;
  resetFiltre: () => void;
  facilitiesList: Facility[];
  visible?: boolean;
  onClose?: () => void;
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
  visible = true,
  onClose,
}) => {
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);

  if (!visible) return null;

  const toggleFacility = (id: string, checked: boolean) => {
    setFilters((prev) => {
      const updated = checked
        ? [...prev.facilities, id]
        : prev.facilities.filter((f) => f !== id);
      return { ...prev, facilities: updated };
    });
  };

  return (
    <div
      className={`${
        onClose ? "fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-start" : ""
      }`}
    >
      <aside
        className={`w-full lg:w-full max-w-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 py-8 px-6 rounded-xl shadow min-h-[500px] ${
          onClose ? "h-full overflow-y-auto relative" : "sticky top-6"
        }`}
      >
        {/* Close Button (mobile only) */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Închide filtrele"
            className="absolute top-4 right-4 text-gray-600 dark:text-gray-300 text-xl"
          >
            ✕
          </button>
        )}

        {/* PRICE SLIDER */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Interval preț: {filters.pretMin} – {filters.pretMax} lei
          </label>
          <Range
            min={minPrice}
            max={maxPrice}
            step={10}
            value={[filters.pretMin, filters.pretMax]}
            allowCross={false}
            onChange={([pretMin, pretMax]) =>
              setFilters((prev) => ({ ...prev, pretMin, pretMax }))
            }
          />
        </div>

        {/* PERSONS SLIDER */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Număr persoane: {filters.persoaneMin} – {filters.persoaneMax}
          </label>
          <Range
            min={persoaneRange.min}
            max={persoaneRange.max}
            step={1}
            value={[filters.persoaneMin, filters.persoaneMax]}
            allowCross={false}
            onChange={([persoaneMin, persoaneMax]) =>
              setFilters((prev) => ({ ...prev, persoaneMin, persoaneMax }))
            }
          />
        </div>

        {/* FACILITIES TOGGLE */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setFacilitiesOpen((prev) => !prev)}
            className="w-full text-left font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between py-2 px-3 rounded bg-gray-50 dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600 transition"
          >
            <span>Facilități</span>
            <svg
              className={`ml-2 w-4 h-4 transform transition-transform ${
                facilitiesOpen ? "rotate-180" : "rotate-0"
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {facilitiesOpen && (
            <div className="pt-3">
              <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
                {facilitiesList.map((facility) => (
                  <label
                    key={facility.id}
                    className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="checkbox"
                      className="mr-2 accent-teal-500"
                      checked={filters.facilities.includes(facility.id)}
                      onChange={(e) => toggleFacility(facility.id, e.target.checked)}
                    />
                    {facility.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RESET BUTTON */}
        <button
          onClick={resetFiltre}
          className="block mt-4 text-sm text-teal-600 hover:text-teal-700 underline transition"
        >
          Resetează filtrele
        </button>
      </aside>
    </div>
  );
};

export default FilterSidebar;
