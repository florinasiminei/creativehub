import React from 'react';
import { ImagePlus } from 'lucide-react';

type ImageDropzoneProps = {
  title: string;
  subtitle: string;
  helper: string;
  accept: string;
  isActive: boolean;
  isInvalid?: boolean;
  onActiveChange: (active: boolean) => void;
  onFilesSelected: (files: File[]) => void;
};

export default function ImageDropzone({
  title,
  subtitle,
  helper,
  accept,
  isActive,
  isInvalid = false,
  onActiveChange,
  onFilesSelected,
}: ImageDropzoneProps) {
  const stateClass = isInvalid
    ? 'border-red-300 bg-[linear-gradient(135deg,rgba(254,242,242,0.98),rgba(255,255,255,0.94))] text-red-700 shadow-[0_18px_45px_-35px_rgba(220,38,38,0.38)] dark:border-red-500/80 dark:bg-[linear-gradient(145deg,rgba(69,10,10,0.92),rgba(24,24,27,0.98))] dark:text-red-100 dark:shadow-[0_24px_60px_-42px_rgba(248,113,113,0.45)]'
    : isActive
      ? 'border-emerald-400 bg-[linear-gradient(135deg,rgba(220,252,231,0.96),rgba(236,253,245,0.98)_52%,rgba(255,255,255,0.95))] text-emerald-800 shadow-[0_18px_45px_-35px_rgba(5,150,105,0.7)] dark:border-emerald-400 dark:bg-[linear-gradient(145deg,rgba(6,78,59,0.92),rgba(9,24,21,0.98))] dark:text-emerald-100 dark:shadow-[0_24px_60px_-42px_rgba(16,185,129,0.48)]'
      : 'border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.88),rgba(255,255,255,0.95))] text-emerald-900 hover:border-emerald-400 hover:shadow-[0_18px_45px_-35px_rgba(5,150,105,0.55)] dark:border-emerald-800/80 dark:bg-[linear-gradient(145deg,rgba(10,25,22,0.98),rgba(18,43,35,0.95)_48%,rgba(24,24,27,0.98))] dark:text-emerald-100 dark:hover:border-emerald-500 dark:hover:shadow-[0_24px_60px_-42px_rgba(16,185,129,0.36)]';

  const iconClass = isInvalid
    ? 'bg-white/88 text-red-600 ring-red-200/70 dark:bg-red-950/65 dark:text-red-100 dark:ring-red-400/25'
    : isActive
      ? 'bg-white/90 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-100 dark:ring-emerald-400/30'
      : 'bg-white/82 text-emerald-700 ring-black/5 dark:bg-zinc-950/72 dark:text-emerald-100 dark:ring-white/10';

  const subtitleClass = isInvalid
    ? 'text-red-600/90 dark:text-red-200/78'
    : 'text-gray-600 dark:text-emerald-100/70';

  const helperClass = isInvalid
    ? 'border-red-200/80 bg-white/82 text-red-700 dark:border-red-400/25 dark:bg-red-950/55 dark:text-red-100'
    : 'border-white/80 bg-white/70 text-gray-600 dark:border-emerald-400/15 dark:bg-zinc-950/72 dark:text-emerald-100/78';

  return (
    <label
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-[28px] border-2 border-dashed px-6 py-8 text-center transition ${stateClass}`}
      aria-invalid={isInvalid}
      onDragOver={(e) => {
        e.preventDefault();
        onActiveChange(true);
      }}
      onDragLeave={() => onActiveChange(false)}
      onDrop={(e) => {
        e.preventDefault();
        onActiveChange(false);
        const list = Array.from(e.dataTransfer.files || []);
        onFilesSelected(list);
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.45),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_55%)]" />
      <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ring-1 ${iconClass}`}>
        <ImagePlus className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="relative space-y-1">
        <div className="text-base font-semibold">{title}</div>
        <div className={`text-xs ${subtitleClass}`}>{subtitle}</div>
      </div>
      <input
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          const list = e.currentTarget.files ? Array.from(e.currentTarget.files) : [];
          onFilesSelected(list);
          e.currentTarget.value = '';
        }}
      />
      <span className={`relative rounded-full border px-3 py-1 text-xs font-medium shadow-sm ${helperClass}`}>
        {helper}
      </span>
    </label>
  );
}
