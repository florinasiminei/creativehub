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
      <div className="text-sm font-medium mb-2">Facilitati <span className="text-gray-500">(optional)</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {facilities.map((f) => (
          <label key={f.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:border-emerald-400 transition">
            <input type="checkbox" checked={selected.includes(f.id)} onChange={() => onToggle(f.id)} className="h-4 w-4" />
            <span className="text-sm">{f.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
