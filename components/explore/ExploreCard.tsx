"use client";

import { useState } from "react";
import Image from "@/components/R2Image";
import Link from "next/link";
import { ArrowUpRight, ImageIcon } from "lucide-react";
import { CARD_IMAGE_QUALITY, EXPLORE_IMAGE_SIZES } from "@/lib/imageConfig";

type ExploreCardProps = {
  href: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  count?: number;
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
  imageSizes?: string;
};

function CardPhoto({ src, alt, position, sizes }: { src?: string; alt: string; position?: string; sizes: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || src === "/fallback.svg" || failed) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 via-stone-100 to-emerald-50 dark:from-emerald-950 dark:via-zinc-800 dark:to-zinc-900">
        <ImageIcon aria-hidden="true" className="h-12 w-12 text-emerald-700/40 dark:text-emerald-300/40" strokeWidth={1} />
        <span className="sr-only">Fotografie indisponibilă</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      loading="lazy"
      sizes={sizes}
      quality={CARD_IMAGE_QUALITY}
      onError={() => setFailed(true)}
      className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105 motion-reduce:transition-none"
      style={{ objectPosition: position }}
    />
  );
}

export default function ExploreCard({
  href,
  title,
  subtitle,
  eyebrow,
  count,
  image,
  imageAlt = "",
  imagePosition,
  imageSizes = EXPLORE_IMAGE_SIZES,
}: ExploreCardProps) {
  return (
    <article className="flex min-w-0 flex-col">
      <Link
        href={href}
        aria-label={[title, eyebrow, subtitle].filter(Boolean).join(" · ")}
        className="group block flex-1 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm outline-none transition hover:border-emerald-300 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-4 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-emerald-500/50 dark:focus-visible:ring-offset-zinc-950"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <CardPhoto key={image || "empty"} src={image} alt={imageAlt} position={imagePosition} sizes={imageSizes} />
          {eyebrow && (
            <span className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-full bg-zinc-950/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              {eyebrow}
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h3>
            <ArrowUpRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
          </div>
          {subtitle && <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{subtitle}</p>}
          {count !== undefined && (
            <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {count === 0 ? "În curând" : `${count} ${count === 1 ? "proprietate" : "proprietăți"}`}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
