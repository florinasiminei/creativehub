import React from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Clock3, LoaderCircle, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { CONSTRAINED_GRID_PREVIEW_LIMIT, isConstrainedClientDevice } from '@/lib/deviceProfile';

type ExistingImage = { id: string; image_url: string; alt?: string | null; preview_url?: string | null };

type UnifiedGalleryGridProps = {
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
  locked?: boolean;
  failedNames?: string[];
  galleryOrder?: string[];
  pendingIds?: string[];
  onMoveToken?: (token: string, direction: -1 | 1) => void;
  onReorderToken?: (token: string, toIndex: number) => void;
  onDeleteToken?: (token: string) => void;
  existingImages?: ExistingImage[];
  existingDraggingIdx?: number | null;
  onExistingDragStart?: (idx: number) => void;
  onExistingDragOver?: (idx: number) => void;
  onExistingDragEnd?: () => void;
  onExistingMove?: (from: number, to: number) => void;
  onExistingDelete?: (img: ExistingImage) => void;
};

type GalleryItem =
  | {
      kind: 'existing';
      key: string;
      token: string;
      image: ExistingImage;
      overallIndex: number;
      localIndex: number;
      src: string;
      status: 'ready';
    }
  | {
      kind: 'pending';
      key: string;
      token: string;
      file: File;
      preview: string;
      overallIndex: number;
      localIndex: number;
      status: 'failed' | 'preparing' | 'uploading' | 'queued';
    };

function StatusBadge({ status }: { status: GalleryItem['status'] }) {
  if (status === 'ready') {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
        <CheckCircle2 size={12} />
        Ready
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-200">
        <AlertCircle size={12} />
        Failed
      </div>
    );
  }

  if (status === 'uploading') {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
        <LoaderCircle size={12} className="animate-spin" />
        Uploading
      </div>
    );
  }

  if (status === 'preparing') {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        <LoaderCircle size={12} className="animate-spin" />
        Preparing
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:bg-zinc-800 dark:text-gray-200">
      <Clock3 size={12} />
      Queued
    </div>
  );
}

export default function UnifiedGalleryGrid({
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
  locked = false,
  failedNames = [],
  galleryOrder,
  pendingIds = [],
  onMoveToken,
  onReorderToken,
  onDeleteToken,
  existingImages = [],
  existingDraggingIdx = null,
  onExistingDragStart,
  onExistingDragOver,
  onExistingDragEnd,
  onExistingMove,
  onExistingDelete,
}: UnifiedGalleryGridProps) {
  const [compactMode, setCompactMode] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [draggingToken, setDraggingToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCompactMode(isConstrainedClientDevice());
  }, []);

  const failedSet = React.useMemo(() => new Set(failedNames), [failedNames]);
  const usesUnifiedOrder = Boolean(galleryOrder && onMoveToken && onDeleteToken);

  const items = React.useMemo<GalleryItem[]>(() => {
    if (usesUnifiedOrder && galleryOrder) {
      const imageById = new Map(existingImages.map((image, index) => [image.id, { image, index }] as const));
      const pendingById = new Map(pendingIds.map((id, index) => [id, { file: files[index], preview: previews[index] || '', index }] as const));

      return galleryOrder.reduce<GalleryItem[]>((acc, token, overallIndex) => {
        if (token.startsWith('saved:')) {
          const imageId = token.slice('saved:'.length);
          const match = imageById.get(imageId);
          if (!match) return acc;
          acc.push({
            kind: 'existing' as const,
            key: token,
            token,
            image: match.image,
            overallIndex,
            localIndex: match.index,
            src: match.image.preview_url || match.image.image_url,
            status: 'ready' as const,
          });
          return acc;
        }

        if (!token.startsWith('pending:')) return acc;

        const pendingId = token.slice('pending:'.length);
        const match = pendingById.get(pendingId);
        if (!match?.file) return acc;

        let status: GalleryItem['status'] = 'queued';
        if (failedSet.has(match.file.name)) status = 'failed';
        else if (!match.preview) status = 'preparing';
        else if (locked && overallIndex === 0) status = 'uploading';

        acc.push({
          kind: 'pending' as const,
          key: token,
          token,
          file: match.file,
          preview: match.preview,
          overallIndex,
          localIndex: match.index,
          status,
        });
        return acc;
      }, []);
    }

    const existing = existingImages.map((image, index) => ({
      kind: 'existing' as const,
      key: image.id,
      token: `saved:${image.id}`,
      image,
      overallIndex: index,
      localIndex: index,
      src: image.preview_url || image.image_url,
      status: 'ready' as const,
    }));

    const pending = files.map((file, index) => {
      let status: GalleryItem['status'] = 'queued';
      if (failedSet.has(file.name)) status = 'failed';
      else if (!previews[index]) status = 'preparing';
      else if (locked && index === 0) status = 'uploading';

      return {
        kind: 'pending' as const,
        key: `${file.name}-${index}`,
        token: `pending:${index}`,
        file,
        preview: previews[index] || '',
        overallIndex: existing.length + index,
        localIndex: index,
        status,
      };
    });

    return [...existing, ...pending];
  }, [existingImages, failedSet, files, galleryOrder, locked, pendingIds, previews, usesUnifiedOrder]);

  const visibleItems = compactMode && !expanded ? items.slice(0, CONSTRAINED_GRID_PREVIEW_LIMIT) : items;

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
        </div>
        <div className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-200">
          {items.length} imagini in galerie
        </div>
      </div>

      {compactMode && items.length > CONSTRAINED_GRID_PREVIEW_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300"
        >
          {expanded ? 'Arata mai putine' : `Arata toata galeria (${items.length - CONSTRAINED_GRID_PREVIEW_LIMIT} in plus)`}
        </button>
      )}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {visibleItems.map((item) => {
          const isExisting = item.kind === 'existing';
          const existingItem = isExisting ? item : null;
          const pendingItem = isExisting ? null : item;
          const unifiedIndex = items.findIndex((candidate) => candidate.token === item.token);
          const disabledExistingHandlers =
            !onExistingDragStart || !onExistingDragOver || !onExistingDragEnd || !onExistingMove || !onExistingDelete;

          const canDrag = usesUnifiedOrder
            ? Boolean(onReorderToken) && (!locked || isExisting)
            : isExisting
              ? !disabledExistingHandlers
              : !locked;
          const canMoveUp = usesUnifiedOrder ? unifiedIndex > 0 : isExisting ? item.localIndex > 0 : !locked && item.localIndex > 0;
          const canMoveDown = usesUnifiedOrder
            ? unifiedIndex < items.length - 1
            : isExisting
              ? item.localIndex < existingImages.length - 1
              : !locked && item.localIndex < files.length - 1;
          const isDragging = usesUnifiedOrder
            ? draggingToken === item.token
            : isExisting
              ? existingDraggingIdx === item.localIndex
              : draggingIdx === item.localIndex;

          return (
            <div
              key={item.key}
              className={`overflow-hidden rounded-[24px] border bg-white shadow-[0_16px_45px_-34px_rgba(15,23,42,0.55)] [content-visibility:auto] [contain-intrinsic-size:280px] dark:border-zinc-800 dark:bg-zinc-900 ${
                isDragging ? 'ring-2 ring-emerald-500' : ''
              } ${item.status === 'failed' ? 'border-red-400 ring-1 ring-red-300' : ''}`}
              draggable={canDrag}
              onDragStart={() => {
                if (!canDrag) return;
                if (usesUnifiedOrder) {
                  setDraggingToken(item.token);
                  return;
                }
                if (isExisting) onExistingDragStart?.(item.localIndex);
                else onDragStart(item.localIndex);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!canDrag) return;
                if (usesUnifiedOrder) {
                  if (!draggingToken || draggingToken === item.token) return;
                  const targetIndex = items.findIndex((candidate) => candidate.token === item.token);
                  if (targetIndex === -1) return;
                  onReorderToken?.(draggingToken, targetIndex);
                  return;
                }
                if (isExisting) onExistingDragOver?.(item.localIndex);
                else onDragOver(item.localIndex);
              }}
              onDragEnd={() => {
                if (usesUnifiedOrder) {
                  setDraggingToken(null);
                  return;
                }
                if (isExisting) onExistingDragEnd?.();
                else onDragEnd();
              }}
            >
              <div
                className={`relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),rgba(249,250,251,0.96)_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),rgba(24,24,27,0.96)_60%)] ${
                  compactMode ? 'h-40 sm:h-52' : 'h-56 sm:h-60 md:h-64'
                }`}
              >
                {existingItem?.src ? (
                  <Image
                    src={existingItem.src}
                    alt={existingItem.image.alt || 'Imagine listare'}
                    fill
                    unoptimized={Boolean(existingItem.image.preview_url)}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="relative z-10 object-contain"
                  />
                ) : pendingItem?.preview ? (
                  <Image
                    src={pendingItem.preview}
                    alt={`Imagine ${pendingItem.overallIndex + 1}`}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="relative z-10 object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    Pregatim preview-ul...
                  </div>
                )}

                <div className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-gray-700 shadow">
                  #{item.overallIndex + 1}
                </div>
                <div className="absolute bottom-3 left-3 z-20">
                  <StatusBadge status={item.status} />
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-100 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {isExisting ? item.image.alt || `Imagine ${item.overallIndex + 1}` : item.file.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {isExisting ? 'Deja urcata pe draft' : item.status === 'uploading' ? 'Se incarca acum' : item.status === 'failed' ? 'A esuat, ramane in coada' : 'In asteptare pentru upload'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (usesUnifiedOrder) onMoveToken?.(item.token, -1);
                      else if (isExisting) onExistingMove?.(item.localIndex, item.localIndex - 1);
                      else onMove(item.localIndex, item.localIndex - 1);
                    }}
                    disabled={!canMoveUp}
                    aria-label="Muta in sus"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700 dark:text-gray-100"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (usesUnifiedOrder) onMoveToken?.(item.token, 1);
                      else if (isExisting) onExistingMove?.(item.localIndex, item.localIndex + 1);
                      else onMove(item.localIndex, item.localIndex + 1);
                    }}
                    disabled={!canMoveDown}
                    aria-label="Muta in jos"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700 dark:text-gray-100"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (usesUnifiedOrder) onDeleteToken?.(item.token);
                      else if (isExisting) onExistingDelete?.(item.image);
                      else onRemove(item.localIndex);
                    }}
                    disabled={usesUnifiedOrder ? !isExisting && locked : !isExisting && locked}
                    aria-label="Sterge imaginea"
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-xs font-semibold text-red-600 disabled:opacity-40 dark:border-zinc-700"
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
