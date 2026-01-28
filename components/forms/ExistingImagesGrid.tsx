import React from 'react';
import Image from 'next/image';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

type ExistingImage = { id: string; image_url: string; alt?: string | null };

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
  if (images.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {images.map((img, idx) => (
          <div
            key={img.id}
            className={`rounded-xl overflow-hidden border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${draggingIdx === idx ? 'ring-2 ring-emerald-500' : ''}`}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOver(idx);
            }}
            onDragEnd={onDragEnd}
          >
            <div className="relative h-48 bg-gray-50">
              <Image
                src={img.image_url}
                alt={img.alt || 'Imagine listare'}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded-full bg-white/80 text-gray-700 shadow">#{idx + 1}</div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 border-t bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">#{idx + 1}</div>
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => onMove(idx, idx - 1)}
                  disabled={idx === 0}
                  aria-label="Mută în sus"
                  className="h-8 w-8 rounded-full border text-xs font-semibold disabled:opacity-40 flex items-center justify-center dark:border-zinc-700 dark:text-gray-100"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(idx, idx + 1)}
                  disabled={idx === images.length - 1}
                  aria-label="Mută în jos"
                  className="h-8 w-8 rounded-full border text-xs font-semibold disabled:opacity-40 flex items-center justify-center dark:border-zinc-700 dark:text-gray-100"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(img)}
                  aria-label="Șterge imaginea"
                  className="h-8 w-8 rounded-full border text-xs font-semibold text-red-600 flex items-center justify-center dark:border-zinc-700"
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
