'use client';

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import Image from '@/components/R2Image';
import { AlertCircle, Check, GripVertical, ImagePlus, X } from 'lucide-react';
import { CARD_IMAGE_QUALITY } from '@/lib/imageConfig';
import { INSTAGRAM_MAX_IMAGES, type PromotionImage, type PromotionSource } from '@/lib/social/instagram';

type Props = {
  availableImages: PromotionSource['images'];
  images: PromotionImage[];
  selectedIndex: number;
  disabled: boolean;
  onSelect: (index: number) => void;
  onChange: (images: PromotionImage[]) => void;
};

type Drag = { imageId: string; pointerId: number; startX: number; startY: number; active: boolean };
type DragPreview = { imageId: string; targetId: string | null; x: number; y: number };

export default function PromotionPhotoGallery({ availableImages, images, selectedIndex, disabled, onSelect, onChange }: Props) {
  const galleryId = useId();
  const grid = useRef<HTMLOListElement>(null);
  const drag = useRef<Drag | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  function reorder(imageId: string, targetId: string) {
    if (disabled || imageId === targetId) return;
    const from = images.findIndex((image) => image.imageId === imageId);
    const to = images.findIndex((image) => image.imageId === targetId);
    if (from < 0 || to < 0) return;
    const next = [...images];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
    setAnnouncement(`Fotografia este acum pe poziția ${to + 1}${to === 0 ? ', coperta postării' : ''}.`);
  }

  function targetAt(x: number, y: number) {
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-promotion-photo-id]');
    return target && grid.current?.contains(target) ? target.dataset.promotionPhotoId || null : null;
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, imageId: string) {
    if (disabled || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { imageId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: false };
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (disabled || !current || current.pointerId !== event.pointerId) return;
    if (!current.active && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 6) return;
    current.active = true;
    setDragPreview({ imageId: current.imageId, targetId: targetAt(event.clientX, event.clientY), x: event.clientX, y: event.clientY });
  }

  function cancelDrag() {
    drag.current = null;
    setDragPreview(null);
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const target = current.active ? targetAt(event.clientX, event.clientY) : null;
    cancelDrag();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (target && !disabled) reorder(current.imageId, target);
  }

  function reorderWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, imageId: string) {
    if (disabled) return;
    if (event.key === 'Escape') { cancelDrag(); return; }
    const from = images.findIndex((image) => image.imageId === imageId);
    const columns = grid.current ? getComputedStyle(grid.current).gridTemplateColumns.split(' ').length : 2;
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    const to = from + offset;
    if (from < 0 || to < 0 || to >= images.length) return;
    if (to !== from) reorder(imageId, images[to].imageId);
    const handle = event.currentTarget;
    window.requestAnimationFrame(() => handle.focus({ preventScroll: true }));
  }

  function toggleImage(imageId: string) {
    if (disabled) return;
    if (images.some((image) => image.imageId === imageId)) {
      onChange(images.filter((image) => image.imageId !== imageId));
    } else if (images.length < INSTAGRAM_MAX_IMAGES) {
      onChange([...images, { imageId, position: 'centre' }]);
    }
  }

  const draggedImage = dragPreview && availableImages.find((image) => image.id === dragPreview.imageId);

  return <section aria-labelledby={`${galleryId}-title`} className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 id={`${galleryId}-title`} className="text-base font-semibold">Fotografiile postării <span className="ml-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">{images.length}/{INSTAGRAM_MAX_IMAGES}</span></h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">Trage de mâner pentru a schimba ordinea. Prima fotografie este coperta.</p></div>
      <button type="button" disabled={disabled} aria-expanded={libraryOpen} aria-controls={`${galleryId}-library`} onClick={() => setLibraryOpen(!libraryOpen)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
        {libraryOpen ? <X aria-hidden="true" className="h-4 w-4" /> : <ImagePlus aria-hidden="true" className="h-4 w-4" />}{libraryOpen ? 'Închide galeria' : images.length ? 'Schimbă fotografiile' : 'Alege fotografii'}
      </button>
    </div>
    <p id={`${galleryId}-hint`} className="sr-only">Pentru reordonare, trage mânerul fotografiei. Pe tastatură, focalizează mânerul și folosește tastele săgeți. Escape anulează tragerea.</p>
    <ol ref={grid} aria-label="Ordinea fotografiilor postării" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((image, index) => {
        const original = availableImages.find((item) => item.id === image.imageId);
        const dragging = dragPreview?.imageId === image.imageId;
        const dropTarget = dragPreview?.targetId === image.imageId && !dragging;
        return <li key={image.imageId} data-promotion-photo-id={image.imageId} className={`group relative min-w-0 rounded-2xl border-2 p-1 transition-[border-color,opacity,transform] ${dragging ? 'scale-[0.97] opacity-40' : ''} ${dropTarget ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : index === selectedIndex ? 'border-emerald-600' : 'border-transparent'}`}>
          <button type="button" disabled={disabled} onClick={() => onSelect(index)} aria-pressed={index === selectedIndex} aria-label={`Vezi fotografia ${index + 1}${index === 0 ? ', coperta postării' : ''}`} className="relative block aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-zinc-800">
            {original ? <Image src={original.url} alt="" fill sizes="(max-width: 640px) 40vw, 160px" quality={CARD_IMAGE_QUALITY} className="object-cover" draggable={false} /> : <span className="flex h-full flex-col items-center justify-center gap-2 p-3 text-xs text-amber-800 dark:text-amber-300"><AlertCircle aria-hidden="true" className="h-5 w-5" />Fotografie indisponibilă</span>}
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/65 to-transparent" />
            <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-zinc-900">{index === 0 ? 'Copertă' : index + 1}</span>
          </button>
          <button type="button" disabled={disabled} onClick={() => toggleImage(image.imageId)} title="Elimină doar din postare" aria-label={`Elimină fotografia ${index + 1} doar din postare`} className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-zinc-700 transition hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-40"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm"><X aria-hidden="true" className="h-4 w-4" /></span></button>
          <button type="button" disabled={disabled} aria-label={`Reordonează fotografia ${index + 1}`} aria-describedby={`${galleryId}-hint`} onPointerDown={(event) => startDrag(event, image.imageId)} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag} onKeyDown={(event) => reorderWithKeyboard(event, image.imageId)} className="absolute bottom-3 right-3 flex h-11 w-11 touch-none select-none items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-40 active:cursor-grabbing enabled:cursor-grab"><GripVertical aria-hidden="true" className="h-5 w-5" /></button>
        </li>;
      })}
      {images.length === 0 && <li className="col-span-full"><button type="button" disabled={disabled} onClick={() => setLibraryOpen(true)} className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-600 transition hover:border-emerald-500 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-emerald-950/30"><ImagePlus aria-hidden="true" className="h-6 w-6" />Alege fotografiile din galeria cazării</button></li>}
    </ol>

    <div id={`${galleryId}-library`} hidden={!libraryOpen} className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
      <p className="text-sm font-semibold">Galeria cazării</p>
      {images.length >= INSTAGRAM_MAX_IMAGES && <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Ai ales {INSTAGRAM_MAX_IMAGES} fotografii. Elimină una pentru a alege alta.</p>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {availableImages.map((image, index) => {
          const selected = images.some((item) => item.imageId === image.id);
          return <button type="button" key={image.id} disabled={disabled || (!selected && images.length >= INSTAGRAM_MAX_IMAGES)} aria-pressed={selected} aria-label={`Fotografia ${index + 1} din galeria cazării${selected ? ', selectată' : ''}`} onClick={() => toggleImage(image.id)} className={`relative aspect-square overflow-hidden rounded-xl border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${selected ? 'border-emerald-600' : 'border-transparent opacity-75 hover:opacity-100 disabled:opacity-40'}`}>
            <Image src={image.url} alt="" fill sizes="100px" quality={CARD_IMAGE_QUALITY} className="object-cover" draggable={false} />
            {selected && <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-white"><Check aria-hidden="true" className="h-4 w-4" /></span>}
          </button>;
        })}
      </div>
      {availableImages.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">Adaugă mai întâi fotografii în galeria cazării.</p>}
    </div>
    {draggedImage && dragPreview && <div aria-hidden="true" className="pointer-events-none fixed z-50 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-3 overflow-hidden rounded-2xl border-2 border-white shadow-xl" style={{ left: dragPreview.x, top: dragPreview.y }}><Image src={draggedImage.url} alt="" fill sizes="96px" quality={CARD_IMAGE_QUALITY} className="object-cover" draggable={false} /></div>}
    <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
  </section>;
}
