'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { getListingResponsiveSrcSet } from '@/lib/listingImagePaths';

export default function R2Image({
  src, alt, sizes, width, priority = false, loading, fetchPriority, onError, ...props
}: ImageProps) {
  const [failedSrcSet, setFailedSrcSet] = useState<string | null>(null);
  const candidates = typeof src === 'string' ? getListingResponsiveSrcSet(src) : undefined;
  const srcSet = candidates !== failedSrcSet ? candidates : undefined;
  const imageSizes = sizes || (width ? `${width}px` : '100vw');

  // A normal Next preload would download the fallback in addition to the selected R2 file.
  const image = <Image
    {...props}
    src={src}
    alt={alt}
    width={width}
    sizes={sizes}
    unoptimized
    priority={priority && !srcSet}
    loading={priority ? 'eager' : loading}
    fetchPriority={fetchPriority || (priority ? 'high' : undefined)}
    onError={(event) => {
      if (srcSet) {
        // Older uploads and small originals can lack a requested variant.
        // Removing the source lets the browser retry the existing fallback URL.
        setFailedSrcSet(srcSet);
        return;
      }
      onError?.(event);
    }}
  />;
  if (!candidates) return image;

  return <>
    {priority && srcSet && <link
      rel="preload" as="image" type="image/webp"
      imageSrcSet={srcSet} imageSizes={imageSizes} fetchPriority="high"
    />}
    <picture>
      {srcSet && <source type="image/webp" srcSet={srcSet} sizes={imageSizes} />}
      {image}
    </picture>
  </>;
}
