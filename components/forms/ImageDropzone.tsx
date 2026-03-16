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
    ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/40 dark:text-red-200'
    : isActive
      ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-[0_18px_45px_-35px_rgba(5,150,105,0.7)] dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200'
      : 'border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.88),rgba(255,255,255,0.95))] text-emerald-900 hover:border-emerald-400 hover:shadow-[0_18px_45px_-35px_rgba(5,150,105,0.55)] dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100 dark:hover:border-emerald-500';
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-dashed px-6 py-8 text-center transition ${stateClass}`}
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
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900/80">
        <ImagePlus className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <div className="text-base font-semibold">{title}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</div>
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
      <span className="rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-gray-300">
        {helper}
      </span>
    </label>
  );
}
