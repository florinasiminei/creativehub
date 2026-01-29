import React from 'react';

type Facility = { id: string; name: string };

type FacilitiesPickerProps = {
  facilities: Facility[];
  selected: string[];
  onToggle: (id: string) => void;
};

export default function FacilitiesPicker({ facilities, selected, onToggle }: FacilitiesPickerProps) {
  return (
    <div>
      <div className="text-sm font-medium mb-2">Facilitati <span className="text-gray-500 dark:text-gray-400">(optional)</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {facilities.map((f) => (
          <label
            key={f.id}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 hover:border-emerald-400 transition dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-100 dark:hover:border-emerald-500"
          >
            <input
              type="checkbox"
              checked={selected.includes(f.id)}
              onChange={() => onToggle(f.id)}
              className="h-4 w-4"
            />
            <span className="text-sm">{f.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
