import React from 'react';

type FormSubmitBarProps = {
  uploading: boolean;
  uploadedCount: number;
  totalFiles: number;
  loading: boolean;
  submitLabel: string;
  loadingLabel: string;
  idleLabel?: string;
};

export default function FormSubmitBar({
  uploading,
  uploadedCount,
  totalFiles,
  loading,
  submitLabel,
  loadingLabel,
  idleLabel = 'Verifica datele si foloseste butonul de salvare.',
}: FormSubmitBarProps) {
  return (
    <div className="sticky bottom-4 z-10 rounded-[24px] border border-emerald-100 bg-white/92 p-3 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.55)] backdrop-blur sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700/80">Salvare</p>
          <p className="text-sm text-gray-600">
            {uploading ? `Se incarca imaginile... ${uploadedCount}/${totalFiles}` : idleLabel}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || uploading}
          className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-24px_rgba(4,120,87,0.8)] transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? loadingLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}
