import React from 'react';

type SelectedImagesGridProps = {
  title: string;
  subtitle: string;
  files: File[];
  previews: string[];
  draggingIdx: number | null;
  onDragStart: (idx: number) => void;
  onDragOver: (idx: number) => void;
  onDragEnd: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: (idx: number) => void;
};

export default function SelectedImagesGrid({
  title,
  subtitle,
  files,
  previews,
  draggingIdx,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMove,
  onRemove,
}: SelectedImagesGridProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {files.map((f, idx) => (
          <div
            key={`${f.name}-${idx}`}
            className={`rounded-xl overflow-hidden border bg-white shadow-sm ${draggingIdx === idx ? 'ring-2 ring-emerald-500' : ''}`}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOver(idx);
            }}
            onDragEnd={onDragEnd}
          >
            <div className="relative h-48 bg-gray-50 touch-pan-y">
              {previews[idx] && <img src={previews[idx]} alt={`Imagine ${idx + 1}`} className="h-full w-full object-cover" />}
              <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded-full bg-white/80 text-gray-700 shadow">#{idx + 1}</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 border-t bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onMove(idx, idx - 1)} disabled={idx === 0} className="h-8 w-8 rounded-full border text-xs font-semibold disabled:opacity-40">?</button>
                <button type="button" onClick={() => onMove(idx, idx + 1)} disabled={idx === files.length - 1} className="h-8 w-8 rounded-full border text-xs font-semibold disabled:opacity-40">?</button>
                <button type="button" onClick={() => onRemove(idx)} className="h-8 w-8 rounded-full border text-xs font-semibold text-red-600">?</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
