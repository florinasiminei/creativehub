import React from 'react';

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
    ? 'border-red-400 bg-red-50'
    : isActive
      ? 'border-emerald-400 bg-emerald-50'
      : 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400';
  return (
    <label
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition ${stateClass}`}
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
      <div className="text-sm font-medium text-emerald-800">{title}</div>
      <div className="text-xs text-gray-600">{subtitle}</div>
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
      <span className="text-xs text-gray-500">{helper}</span>
    </label>
  );
}
