"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cazare } from "@/lib/utils";
import { CARD_IMAGE_QUALITY, COLLECTION_IMAGE_SIZES } from "@/lib/imageConfig";

type CazareCardProps = {
  cazare: Cazare;
  eager?: boolean;
  priority?: boolean;
  highFetchPriority?: boolean;
  sizes?: string;
};

export default function CazareCard({
  cazare,
  eager = false,
  priority = false,
  highFetchPriority = false,
  sizes = COLLECTION_IMAGE_SIZES,
}: CazareCardProps) {
  const preferredImage = cazare.image || "/fallback.svg";
  const fallbackImage = cazare.imageOriginal || preferredImage;
  const canFallback = fallbackImage !== preferredImage;
  const [imageSrc, setImageSrc] = useState(preferredImage);

  useEffect(() => {
    setImageSrc(preferredImage);
  }, [preferredImage]);

  const handleImageError = useCallback(() => {
    if (canFallback && imageSrc !== fallbackImage) {
      setImageSrc(fallbackImage);
    }
  }, [canFallback, fallbackImage, imageSrc]);

  const locationParts = (cazare.locatie || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const firstPart = locationParts[0]
    ? locationParts[0].replace(/\s*\([^)]*\)\s*$/, "")
    : "";
  const cleanedLocation = [firstPart, ...locationParts.slice(1)].filter(Boolean).join(", ");

  return (
    <Link href={`/cazare/${cazare.slug}`} className="min-w-0">
      <article className="group min-w-0 transition bg-transparent dark:bg-transparent">
        <div className="relative aspect-[2.7/2] overflow-hidden rounded-xl" style={{ aspectRatio: "2.7 / 2" }}>
          <Image
            src={imageSrc}
            fill
            alt={`Imagine ${cazare.title}`}
            loading={eager || priority ? "eager" : "lazy"}
            priority={priority}
            fetchPriority={priority || highFetchPriority ? "high" : "auto"}
            quality={CARD_IMAGE_QUALITY}
            onError={handleImageError}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes={sizes}
          />
        </div>
        <div className="pt-3 space-y-0.5">
          <div className="flex min-h-6 items-start justify-between">
            <h3 className="min-w-0 font-medium text-base line-clamp-1 text-gray-900 dark:text-white flex-1 pr-2">{cazare.title}</h3>
            <div className="text-gray-900 dark:text-white text-sm font-medium whitespace-nowrap" data-nosnippet>
              {cazare.price} lei
            </div>
          </div>
          <div className="flex min-h-5 items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[60%]">
              {cleanedLocation}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{cazare.numarPersoane} persoane</span>
          </div>
        </div>
      </article>
    </Link>
  );
}




