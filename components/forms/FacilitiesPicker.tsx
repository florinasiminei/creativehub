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
          Facilități <span className="font-normal text-gray-500 dark:text-gray-400">(opțional)</span>
        </div>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {selectedCount} {selectedCount === 1 ? "selectată" : "selectate"}
        </span>
      </div>

      <div className="space-y-4">
        {facilities.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Lista facilităților nu este disponibilă momentan. Reîncarcă pagina pentru a încerca din nou.
          </p>
        )}
        {groupedFacilities.map((group) => (
          <section key={group.key}>
            <div className="mb-2 flex items-center gap-2">
              <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {group.label}
              </h4>
              <span className="text-xs text-gray-400 dark:text-gray-500">{group.facilities.length}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {group.facilities.map((facility) => {
                const isSelected = selected.includes(facility.id);
                return (
                  <label
                    key={facility.id}
                    className={`relative flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors focus-within:ring-2 focus-within:ring-emerald-500 ${
                      isSelected
                        ? "border-zinc-900 bg-zinc-50 text-zinc-950 ring-1 ring-inset ring-zinc-900 dark:border-zinc-200 dark:bg-zinc-800 dark:text-white dark:ring-zinc-200"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(facility.id)}
                      className="sr-only"
                    />
                    <span
                      className="inline-flex shrink-0 items-center justify-center [&_svg]:h-5 [&_svg]:w-5"
                      aria-hidden="true"
                    >
                      {resolveFacilityIcon(facility.name)}
                    </span>
                    <span className="min-w-0 flex-1 text-xs font-medium leading-5 sm:text-sm">{facility.name}</span>
                    <span
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        isSelected
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "text-transparent"
                      }`}
                      aria-hidden="true"
                    >
                      <Check size={12} />
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
