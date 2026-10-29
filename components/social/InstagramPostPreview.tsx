'use client';

import Image from '@/components/R2Image';
import { Bookmark, ChevronLeft, ChevronRight, Heart, MessageCircle, MoreHorizontal, Send } from 'lucide-react';
import { CARD_IMAGE_QUALITY } from '@/lib/imageConfig';
import type { PromotionImage, PromotionSource } from '@/lib/social/instagram';

type Props = {
  source: PromotionSource;
  images: PromotionImage[];
  caption: string;
  renderedImages?: string[];
  final: boolean;
  index: number;
  onIndexChange: (index: number) => void;
};

const cropPositions = { centre: 'center', north: 'top', south: 'bottom', west: 'left', east: 'right' } as const;
const navigationClass = 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800';

export default function InstagramPostPreview({ source, images, caption, renderedImages, final, index, onIndexChange }: Props) {
  const currentIndex = Math.min(index, Math.max(0, images.length - 1));
  const selection = images[currentIndex];
  const original = source.images.find((item) => item.id === selection?.imageId);
  const url = final ? renderedImages?.[currentIndex] : original?.url;

  return <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
    <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-800 font-serif text-xl text-white">c</span>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">cabn.ro</p><p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{source.location || 'Cazări de descoperit'}</p></div>
      <MoreHorizontal aria-hidden="true" className="h-5 w-5 text-zinc-500" />
    </div>
    <div className="relative aspect-[4/5] bg-zinc-100 dark:bg-zinc-800">
      {url ? <Image src={url} alt={`${source.title} · fotografia ${currentIndex + 1} din ${images.length}`} fill
        unoptimized={final} sizes="(max-width: 640px) 90vw, 390px" quality={CARD_IMAGE_QUALITY}
        className="object-cover" style={final ? undefined : { objectPosition: cropPositions[selection?.position || 'centre'] }} />
        : <div className="flex h-full items-center justify-center p-8 text-center text-sm text-zinc-500">Alege cel puțin o fotografie pentru postare.</div>}
      {images.length > 1 && <span className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs font-medium text-white">{currentIndex + 1}/{images.length}</span>}
    </div>
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <button type="button" disabled={currentIndex === 0} onClick={() => onIndexChange(currentIndex - 1)} aria-label="Fotografia anterioară" className={navigationClass}><ChevronLeft aria-hidden="true" className="h-5 w-5" /></button>
      <div className="flex items-center" aria-label="Fotografiile postării">
        {images.map((item, photoIndex) => <button type="button" key={item.imageId} onClick={() => onIndexChange(photoIndex)}
          aria-label={`Vezi fotografia ${photoIndex + 1}`} aria-current={photoIndex === currentIndex ? 'true' : undefined}
          className="flex h-10 w-7 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          <span className={`h-1.5 w-1.5 rounded-full ${photoIndex === currentIndex ? 'bg-emerald-700 dark:bg-emerald-400' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
        </button>)}
      </div>
      <button type="button" disabled={currentIndex >= images.length - 1} onClick={() => onIndexChange(currentIndex + 1)} aria-label="Fotografia următoare" className={navigationClass}><ChevronRight aria-hidden="true" className="h-5 w-5" /></button>
    </div>
    <div aria-hidden="true" className="flex items-center gap-4 px-4 pb-3 text-zinc-700 dark:text-zinc-200"><Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /><Send className="h-5 w-5" /><Bookmark className="ml-auto h-5 w-5" /></div>
    <div className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-800"><p className="mb-2 text-sm font-semibold">cabn.ro</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{caption || 'Textul postării va apărea aici.'}</p></div>
  </div>;
}
