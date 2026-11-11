'use client';

import { useRef, useState } from 'react';
import Image from '@/components/R2Image';
import { BatteryFull, Bell, Bookmark, ChevronLeft, ChevronRight, Facebook, Globe, Heart, Home, Instagram, Menu, MessageCircle, MoreHorizontal, Music2, Plus, Search, Send, Share2, Signal, Store, ThumbsUp, UsersRound, Wifi } from 'lucide-react';
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
const platforms = [
  { id: 'instagram', label: 'Instagram', Icon: Instagram },
  { id: 'facebook', label: 'Facebook', Icon: Facebook },
  { id: 'tiktok', label: 'TikTok', Icon: Music2 },
] as const;
type PreviewPlatform = typeof platforms[number]['id'];

function AccountAvatar({ small = false }: { small?: boolean }) {
  return <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/10 ${small ? 'h-[1.75em] w-[1.75em]' : 'h-[2.5em] w-[2.5em]'}`}>
    <Image src="/images/iconita.svg" alt="CABN" width={295} height={263} unoptimized className="h-[76%] w-[76%] object-contain" />
  </span>;
}

function ReelsIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[1.7em] w-[1.7em]">
    <rect x="3" y="3" width="18" height="18" rx="5" /><path d="M3.5 8.5h17M8 3.5l3.5 5M14.5 3.5l3.5 5" /><path d="m10 12 5 3-5 3z" fill="currentColor" stroke="none" />
  </svg>;
}

function AppTabBar({ platform }: { platform: PreviewPlatform }) {
  const iconClass = 'h-[1.7em] w-[1.7em]';
  const home = <Home className={`${iconClass} fill-current`} strokeWidth={1.6} />;
  if (platform === 'instagram') return <div aria-hidden="true" className="grid h-[3.5em] shrink-0 grid-cols-5 place-items-center border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
    {home}<ReelsIcon /><Send className={iconClass} strokeWidth={1.8} /><Search className={iconClass} strokeWidth={1.8} /><AccountAvatar small />
  </div>;
  if (platform === 'facebook') {
    const tabs = [
      { label: 'Acasă', icon: home },
      { label: 'Reels', icon: <ReelsIcon /> },
      { label: 'Prieteni', icon: <UsersRound className={iconClass} /> },
      { label: 'Marketplace', icon: <Store className={iconClass} /> },
      { label: 'Notificări', icon: <Bell className={iconClass} /> },
      { label: 'Meniu', icon: <span className="relative"><AccountAvatar small /><Menu className="absolute -bottom-[0.15em] -right-[0.2em] h-[0.85em] w-[0.85em] rounded-full bg-zinc-200 p-[0.1em] text-zinc-900 dark:bg-zinc-600 dark:text-white" /></span> },
    ];
    return <div aria-hidden="true" className="grid h-[4em] shrink-0 grid-cols-6 border-t border-zinc-200 bg-white dark:border-zinc-700 dark:bg-[#18191a]">
      {tabs.map((tab, index) => <div key={tab.label} className={`flex min-w-0 flex-col items-center justify-center gap-[0.25em] ${index === 0 ? 'text-[#0866ff] dark:text-[#75b6ff]' : 'text-zinc-500 dark:text-zinc-400'}`}>
        {tab.icon}<span className="max-w-full truncate px-[0.1em] text-[0.58em] font-medium">{tab.label}</span>
      </div>)}
    </div>;
  }
  return <div aria-hidden="true" className="grid h-[3.8em] shrink-0 grid-cols-5 place-items-center border-t border-zinc-200 bg-white dark:border-white/15 dark:bg-black">
    <div className="flex flex-col items-center gap-[0.2em]">{home}<span className="text-[0.62em] font-semibold">Acasă</span></div>
    <div className="flex flex-col items-center gap-[0.2em]"><UsersRound className={iconClass} /><span className="text-[0.62em]">Prieteni</span></div>
    <span className="flex h-[1.85em] w-[2.8em] items-center justify-center rounded-[0.5em] bg-zinc-950 text-white shadow-[-3px_0_0_#25f4ee,3px_0_0_#fe2c55] dark:bg-white dark:text-black"><Plus className="h-[1.5em] w-[1.5em]" strokeWidth={2.5} /></span>
    <div className="flex flex-col items-center gap-[0.2em]"><MessageCircle className={iconClass} /><span className="text-[0.62em]">Mesaje</span></div>
    <div className="flex flex-col items-center gap-[0.2em]"><AccountAvatar small /><span className="text-[0.62em]">Profil</span></div>
  </div>;
}

function PhotoDots({ count, current, monochrome = false }: { count: number; current: number; monochrome?: boolean }) {
  if (count < 2) return null;
  return <div aria-hidden="true" className="flex items-center justify-center gap-[0.3em] py-[0.45em]">
    {Array.from({ length: count }, (_, dot) => <span key={dot} className={`h-[0.35em] w-[0.35em] rounded-full ${dot === current ? monochrome ? 'bg-zinc-900 dark:bg-white' : 'bg-sky-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />)}
  </div>;
}

export default function InstagramPostPreview({ source, images, caption, renderedImages, final, index, onIndexChange }: Props) {
  const [platform, setPlatform] = useState<PreviewPlatform>('instagram');
  const [facebookPhotoOpen, setFacebookPhotoOpen] = useState(false);
  const facebookBackButton = useRef<HTMLButtonElement>(null);
  const facebookFeed = useRef<HTMLDivElement>(null);
  const currentIndex = Math.min(index, Math.max(0, images.length - 1));
  const text = caption || 'Textul postării va apărea aici.';

  function selectPlatform(next: PreviewPlatform) {
    setPlatform(next);
    setFacebookPhotoOpen(false);
  }

  function showImage(nextIndex: number) {
    onIndexChange(nextIndex);
    if (platform === 'facebook') setFacebookPhotoOpen(true);
  }

  function photo(photoIndex: number, className = 'aspect-[4/5]', showCounter = true) {
    const selection = images[photoIndex];
    const original = source.images.find((item) => item.id === selection?.imageId);
    const url = final ? renderedImages?.[photoIndex] : original?.url;
    return <div className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${className}`}>
      {url ? <Image src={url} alt={`${source.title} · fotografia ${photoIndex + 1} din ${images.length}`} fill
        unoptimized={final} sizes="(max-width: 640px) 85vw, 336px" quality={CARD_IMAGE_QUALITY}
        className="object-cover" style={final ? undefined : { objectPosition: cropPositions[selection?.position || 'centre'] }} />
        : <div className="flex h-full items-center justify-center p-[1.5em] text-center text-[0.85em] leading-relaxed text-zinc-500 dark:text-zinc-400">Alege cel puțin o fotografie pentru postare.</div>}
      {showCounter && images.length > 1 && <span className="absolute right-[0.7em] top-[0.7em] rounded-full bg-black/60 px-[0.7em] py-[0.3em] text-[0.75em] font-medium text-white">{photoIndex + 1}/{images.length}</span>}
    </div>;
  }

  function postCaption() {
    return <div className="text-[0.95em] leading-[1.4] text-zinc-950 dark:text-zinc-100">
      <p className="line-clamp-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {platform === 'instagram' && <span className="mr-[0.35em] font-semibold">cabn.ro</span>}{text}
      </p>
      {caption && <span aria-hidden="true" className="text-[0.85em] font-medium text-zinc-500 dark:text-zinc-400">mai mult</span>}
    </div>;
  }

  return <div className="mx-auto w-full min-w-0 max-w-[356px] space-y-4" data-social-preview={platform}>
    <div role="group" aria-label="Platforma previzualizată" className="grid grid-cols-3 gap-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-950/50">
      {platforms.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => selectPlatform(id)} aria-pressed={platform === id} aria-label={id === 'instagram' ? 'Previzualizare Instagram' : `Previzualizare ${label}, simulare fără publicare`}
        className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:flex-row sm:gap-1.5 ${platform === id ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}>
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{label}{id !== 'instagram' && <span className="block text-[10px] font-normal leading-3 text-zinc-500 dark:text-zinc-400">Simulare</span>}</span>
      </button>)}
    </div>

    <div data-phone-frame className="relative aspect-[719/1500] w-full rounded-[15%/7.19%] bg-gradient-to-br from-zinc-500 via-zinc-800 to-zinc-600 shadow-[inset_0_0_0_1px_#808086,inset_0_0_0_3px_#252527,0_22px_50px_-18px_rgba(0,0,0,0.5)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-[1%] rounded-[14%/6.7%] bg-black shadow-[inset_0_0_0_1px_#39393d]" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-[0.6%] top-[14%] h-[3.5%] w-[0.7%] rounded-l-sm bg-zinc-600" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-[0.6%] top-[21%] h-[7%] w-[0.7%] rounded-l-sm bg-zinc-600" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-[0.6%] top-[30%] h-[7%] w-[0.7%] rounded-l-sm bg-zinc-600" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-[0.6%] top-[24%] h-[11%] w-[0.7%] rounded-r-sm bg-zinc-600" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-[0.6%] top-[59%] h-[5.5%] w-[0.7%] rounded-r-sm bg-zinc-600" />
      <div data-phone-screen className={`absolute left-1/2 top-1/2 aspect-[1206/2622] w-[92.5%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[12.3%/5.66%] bg-white text-zinc-950 [container-type:inline-size] [color-scheme:light] dark:text-white dark:[color-scheme:dark] ${platform === 'facebook' ? 'dark:bg-[#18191a]' : 'dark:bg-black'}`}>
        <div className="absolute inset-0 flex min-h-0 flex-col" style={{ fontSize: '3.48cqw', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div aria-hidden="true" className="relative h-[4.15em] shrink-0">
          <span className="absolute left-[9%] top-[1.05em] text-[1.1em] font-semibold tracking-tight">9:41</span>
          <span className="absolute left-1/2 top-[0.8em] h-[2em] w-[24%] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10"><span className="absolute right-[0.55em] top-1/2 h-[0.45em] w-[0.45em] -translate-y-1/2 rounded-full bg-[#10131e] ring-1 ring-[#1d2130]" /></span>
          <span className="absolute right-[7%] top-[1.3em] flex items-center gap-[0.35em]"><Signal className="h-[1em] w-[1em]" strokeWidth={2.4} /><Wifi className="h-[1.1em] w-[1.1em]" strokeWidth={2.3} /><BatteryFull className="h-[1.2em] w-[1.6em]" /></span>
        </div>

        {platform === 'instagram' && <>
          <div aria-hidden="true" className="flex h-[3.15em] shrink-0 items-center justify-between border-b border-zinc-100 px-[0.9em] dark:border-zinc-800">
            <ChevronLeft className="h-[1.65em] w-[1.65em]" /><span className="text-[1em] font-semibold">Postări</span><span className="w-[1.65em]" />
          </div>
          <div key={platform} role="article" aria-label="Postarea Instagram" className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-[0.65em] px-[0.9em] py-[0.7em]">
              <AccountAvatar /><div className="min-w-0 flex-1"><p className="text-[0.85em] font-semibold">cabn.ro</p><p className="truncate text-[0.75em] text-zinc-500 dark:text-zinc-400">{source.location || 'Cazări de descoperit'}</p></div><MoreHorizontal aria-hidden="true" className="h-[1.65em] w-[1.65em]" />
            </div>
            {photo(currentIndex)}
            <div className="relative px-[0.9em] pt-[0.8em]">
              <div aria-hidden="true" className="flex items-center gap-[0.9em]"><Heart className="h-[1.65em] w-[1.65em]" /><MessageCircle className="h-[1.65em] w-[1.65em]" /><Send className="h-[1.65em] w-[1.65em]" /><Bookmark className="ml-auto h-[1.65em] w-[1.65em]" /></div>
              <PhotoDots count={images.length} current={currentIndex} />
            </div>
            <div className="px-[0.9em] pb-[0.9em] pt-[0.3em]">{postCaption()}</div>
          </div>
        </>}

        {platform === 'facebook' && <>
          {facebookPhotoOpen ? <div className="flex h-[3.15em] shrink-0 items-center border-b border-zinc-100 px-[0.35em] dark:border-zinc-700">
            <button ref={facebookBackButton} type="button" onClick={() => { setFacebookPhotoOpen(false); window.requestAnimationFrame(() => facebookFeed.current?.focus()); }} aria-label="Înapoi la postarea Facebook" className="flex h-[3.15em] w-[3em] shrink-0 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><ChevronLeft aria-hidden="true" className="h-[1.65em] w-[1.65em]" /></button>
            <p className="text-[0.85em] font-semibold">Fotografiile postării</p>
          </div> : <div aria-hidden="true" className="flex h-[3.15em] shrink-0 items-center justify-between gap-[0.65em] px-[0.9em]"><span className="text-[1.9em] font-bold tracking-tight text-[#0866ff]">facebook</span><div className="flex shrink-0 gap-[0.65em]"><Plus className="h-[1.35em] w-[1.35em]" /><Search className="h-[1.35em] w-[1.35em]" /><MessageCircle className="h-[1.35em] w-[1.35em]" /></div></div>}
          <div ref={facebookFeed} key={`${platform}:${facebookPhotoOpen}`} tabIndex={-1} role="article" aria-label="Postarea Facebook" className="min-h-0 min-w-0 flex-1 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500">
            <div className="flex items-center gap-[0.65em] border-t-[0.3em] border-zinc-100 px-[0.9em] py-[0.8em] dark:border-zinc-800"><AccountAvatar /><div className="min-w-0 flex-1"><p className="text-[0.85em] font-semibold">cabn.ro</p><p className="mt-[0.15em] flex items-center gap-[0.3em] text-[0.75em] text-zinc-500 dark:text-zinc-400">Public<Globe aria-hidden="true" className="h-[0.85em] w-[0.85em]" /></p></div><MoreHorizontal aria-hidden="true" className="h-[1.65em] w-[1.65em]" /></div>
            {!facebookPhotoOpen && <div className="px-[0.9em] pb-[0.6em]">{postCaption()}</div>}
            {facebookPhotoOpen || images.length < 2 ? photo(currentIndex) : <div className={`grid aspect-[4/5] grid-cols-2 gap-0.5 ${images.length > 2 ? 'grid-rows-2' : ''}`}>
              {images.slice(0, 4).map((item, photoIndex) => <button type="button" key={item.imageId} onClick={() => { showImage(photoIndex); window.requestAnimationFrame(() => facebookBackButton.current?.focus()); }} aria-label={`Mărește fotografia ${photoIndex + 1} în previzualizarea Facebook`}
                className={`relative min-h-0 min-w-0 overflow-hidden focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${images.length === 3 && photoIndex === 0 ? 'row-span-2' : ''}`}>
                {photo(photoIndex, 'h-full w-full', false)}
                {images.length > 4 && photoIndex === 3 && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[2em] font-semibold text-white">+{images.length - 4}</span>}
              </button>)}
            </div>}
            {facebookPhotoOpen && <><PhotoDots count={images.length} current={currentIndex} /><div className="px-[0.9em] py-[0.6em]">{postCaption()}</div></>}
            <div aria-hidden="true" className="mx-[0.9em] mt-[0.6em] flex min-h-11 items-center justify-between gap-[0.3em] border-t border-zinc-200 py-[0.3em] text-[0.75em] font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"><span className="flex min-w-0 flex-1 flex-col items-center gap-[0.3em] sm:flex-row"><ThumbsUp className="h-[1.35em] w-[1.35em] shrink-0" />Apreciază</span><span className="flex min-w-0 flex-1 flex-col items-center gap-[0.3em] sm:flex-row"><MessageCircle className="h-[1.35em] w-[1.35em] shrink-0" />Comentariu</span><span className="flex min-w-0 flex-1 flex-col items-center gap-[0.3em] sm:flex-row"><Share2 className="h-[1.35em] w-[1.35em] shrink-0" />Distribuie</span></div>
          </div>
        </>}

        {platform === 'tiktok' && <div role="article" aria-label="Postarea TikTok" className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-x-0 top-[0.7em] z-10 flex items-center justify-center gap-[1.2em] font-semibold"><span className="text-zinc-500 dark:text-white/55">Urmărești</span><span className="border-b-2 border-zinc-950 pb-[0.35em] dark:border-white">Pentru tine</span><Search className="absolute right-[0.9em] h-[1.6em] w-[1.6em]" /></div>
          <div className="absolute inset-x-0 top-[14%]">{photo(currentIndex)}</div>
          <div aria-hidden="true" className="absolute bottom-[8em] right-[0.8em] flex flex-col items-center gap-[1.5em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"><AccountAvatar /><Heart className="h-[2em] w-[2em] fill-white" /><MessageCircle className="h-[2em] w-[2em] fill-white" /><Bookmark className="h-[1.9em] w-[1.9em] fill-white" /><Share2 className="h-[2em] w-[2em]" /></div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent px-[0.9em] pb-[0.75em] pt-[2em] dark:from-black dark:via-black/90"><div className="pr-[3em]"><p className="mb-[0.35em] font-semibold">cabn.ro</p>{postCaption()}</div><PhotoDots count={images.length} current={currentIndex} monochrome /></div>
        </div>}

        <AppTabBar platform={platform} />
        <div aria-hidden="true" className="relative h-[2.15em] shrink-0"><span className="absolute bottom-[0.55em] left-1/2 h-[0.35em] w-[33%] -translate-x-1/2 rounded-full bg-zinc-950 dark:bg-white" /></div>
        </div>
      </div>
    </div>

    {images.length > 1 && <div className="flex items-center justify-center gap-3">
      <button type="button" disabled={currentIndex === 0} onClick={() => showImage(currentIndex - 1)} aria-label="Fotografia anterioară" className={navigationClass}><ChevronLeft aria-hidden="true" className="h-5 w-5" /></button>
      <p aria-live="polite" aria-atomic="true" className="min-w-0 text-center text-xs text-zinc-500 dark:text-zinc-400">Fotografia {currentIndex + 1} din {images.length}</p>
      <button type="button" disabled={currentIndex >= images.length - 1} onClick={() => showImage(currentIndex + 1)} aria-label="Fotografia următoare" className={navigationClass}><ChevronRight aria-hidden="true" className="h-5 w-5" /></button>
    </div>}
  </div>;
}
