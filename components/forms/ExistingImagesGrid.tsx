import React from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { CONSTRAINED_GRID_PREVIEW_LIMIT, isConstrainedClientDevice } from '@/lib/deviceProfile';

type ExistingImage = { id: string; image_url: string; alt?: string | null; preview_url?: string | null };

type ExistingImagesGridProps = {
  title: string;
  subtitle: string;
  images: ExistingImage[];
  draggingIdx: number | null;
  onDragStart: (idx: number) => void;
  onDragOver: (idx: number) => void;
  onDragEnd: () => void;
  onMove: (from: number, to: number) => void;
  onDelete: (img: ExistingImage) => void;
};

export default function ExistingImagesGrid({
  title,
  subtitle,
  images,
  draggingIdx,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMove,
  onDelete,
}: ExistingImagesGridProps) {
  const [compactMode, setCompactMode] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    setCompactMode(isConstrainedClientDevice());
  }, []);

  const visibleImages = compactMode && !expanded ? images.slice(0, CONSTRAINED_GRID_PREVIEW_LIMIT) : images;

  if (images.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
        </div>
        <div className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-200">
          {images.length} imagini existente
        </div>
      </div>

      {compactMode && images.length > CONSTRAINED_GRID_PREVIEW_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300"
        >
          {expanded
            ? 'Arata mai putine'
            : `Arata toata galeria (${images.length - CONSTRAINED_GRID_PREVIEW_LIMIT} in plus)`}
        </button>
      )}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {visibleImages.map((image, idx) => {
          const displaySrc = image.preview_url || image.image_url;

          return (
            <div
              key={image.id}
              className={`overflow-hidden rounded-[24px] border bg-white shadow-[0_16px_45px_-34px_rgba(15,23,42,0.55)] [content-visibility:auto] [contain-intrinsic-size:280px] dark:border-zinc-800 dark:bg-zinc-900 ${
                draggingIdx === idx ? 'ring-2 ring-emerald-500' : ''
              }`}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(event) => {
                event.preventDefault();
                onDragOver(idx);
              }}
              onDragEnd={onDragEnd}
            >
              <div className={`relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),rgba(249,250,251,0.96)_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),rgba(24,24,27,0.96)_60%)] ${
                compactMode ? 'h-40 sm:h-52' : 'h-56 sm:h-60 md:h-64'
              }`}>
                <Image
                  src={displaySrc}
                  alt={image.alt || 'Imagine listare'}
                  fill
                  unoptimized={Boolean(image.preview_url)}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="relative z-20 object-contain"
                />
                <div className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-gray-700 shadow">
                  #{idx + 1}
                </div>
                {image.preview_url && (
                  <div className="absolute bottom-3 left-3 z-30 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                    Preview local
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-gray-100 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">#{idx + 1}</div>
                <div className="ml-auto flex items-center gap-1">
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
                    disabled={idx === images.length - 1}
                    aria-label="Muta in jos"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700 dark:text-gray-100"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(image)}
                    aria-label="Sterge imaginea"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-xs font-semibold text-red-600 dark:border-zinc-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
