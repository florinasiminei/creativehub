import { useMemo } from "react";
import { Check } from "lucide-react";
import { resolveFacilityIcon } from "@/lib/facilityIcons";
import { groupFacilitiesByCategory } from "@/lib/facilityGroups";

type Facility = { id: string; name: string };

type FacilitiesPickerProps = {
  facilities: Facility[];
  selected: string[];
  onToggle: (id: string) => void;
};

export default function FacilitiesPicker({ facilities, selected, onToggle }: FacilitiesPickerProps) {
  const selectedCount = selected.length;

  const groupedFacilities = useMemo(() => groupFacilitiesByCategory(facilities), [facilities]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Facilitati <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
        </div>
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-200">
          {selectedCount} selectate
        </span>
      </div>

      <div className="space-y-3">
        {groupedFacilities.map((group) => (
          <section
            key={group.key}
            className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
          >
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                {group.label}
              </h4>
              <span className="text-xs text-gray-400 dark:text-gray-500">{group.facilities.length}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.facilities.map((facility) => {
                const isSelected = selected.includes(facility.id);
                return (
                  <button
                    key={facility.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onToggle(facility.id)}
                    className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                      isSelected
                        ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500/80 dark:bg-emerald-900/25 dark:text-emerald-100"
                        : "border-gray-200 bg-white text-gray-800 hover:border-emerald-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200 dark:hover:border-emerald-500/70"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
                          : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300"
                      }`}
                    >
                      {resolveFacilityIcon(facility.name)}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium">{facility.name}</span>
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md border ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-gray-300 bg-transparent text-transparent dark:border-zinc-600"
                      }`}
                    >
                      <Check size={12} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
