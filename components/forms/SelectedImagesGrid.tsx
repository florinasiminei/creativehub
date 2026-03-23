import React from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';

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
  failedNames?: string[];
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
  failedNames = [],
}: SelectedImagesGridProps) {
  if (files.length === 0) return null;
  const failedSet = new Set(failedNames);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
        </div>
        <div className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-200">
          {files.length} imagini noi
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {files.map((file, idx) => (
          <div
            key={`${file.name}-${idx}`}
            className={`overflow-hidden rounded-[24px] border bg-white shadow-[0_16px_45px_-34px_rgba(15,23,42,0.55)] dark:border-zinc-800 dark:bg-zinc-900 ${
              draggingIdx === idx ? 'ring-2 ring-emerald-500' : ''
            } ${failedSet.has(file.name) ? 'border-red-400 ring-1 ring-red-300' : ''}`}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(event) => {
              event.preventDefault();
              onDragOver(idx);
            }}
            onDragEnd={onDragEnd}
          >
            <div className="relative h-56 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),rgba(249,250,251,0.96)_60%)] touch-pan-y sm:h-60 md:h-64 dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),rgba(24,24,27,0.96)_60%)]">
              {previews[idx] && (
                <Image
                  src={previews[idx]}
                  alt={`Imagine ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="relative z-10 object-contain"
                  unoptimized
                />
              )}
              <div className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-gray-700 shadow">
                #{idx + 1}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-gray-100 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMove(idx, idx - 1)}
                  disabled={idx === 0}
                  aria-label="Muta in sus"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700 dark:text-gray-100"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(idx, idx + 1)}
                  disabled={idx === files.length - 1}
                  aria-label="Muta in jos"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700 dark:text-gray-100"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  aria-label="Sterge imaginea"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-xs font-semibold text-red-600 dark:border-zinc-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
