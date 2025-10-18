"use client";

import React, { useState, MouseEvent } from 'react';
import Image from 'next/image';
import ReactImageGallery from 'react-image-gallery';
import { useCallback } from 'react';
import { MoveLeft, MoveRight, X } from 'lucide-react';
import 'react-image-gallery/styles/css/image-gallery.css';

interface ImageGalleryProps {
  images: string[];
  className?: string;
  title?: string;
  onClose?: () => void;
  startIndex?: number;
}

type GalleryItemCustom = {
  original: string;
  thumbnail: string;
  originalHeight: number;
  thumbnailHeight: number;
  thumbnailWidth: number;
  description?: string;
};

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, className, title, onClose, startIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const galleryRef = React.useRef<any>(null);
  const items = images.map((url) => ({
    original: url,
    thumbnail: url,
    thumbnailHeight: 64,
    thumbnailWidth: 96,
    description: title ? `${title} - Imagine` : 'Imagine proprietate',
    renderItem: (item: GalleryItemCustom) => (
      <div className="relative w-full h-full">
        <Image
          src={item.original}
          alt={item.description || ''}
          fill
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
          className="object-cover"
        />
      </div>
    ),
    renderThumbInner: (item: GalleryItemCustom) => (
      <div className="relative w-full h-full">
        <Image
          src={item.thumbnail}
          alt="Miniatură"
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>
    ),
  }));

  // Custom navigation arrows
  const renderLeftNav = useCallback((onClick: (e: MouseEvent<HTMLElement>) => void, disabled: boolean) => {
    return (
      <button
        className="image-gallery-icon image-gallery-left-nav absolute left-4 top-1/2 -translate-y-1/2 z-10"
        onClick={onClick}
        disabled={disabled}
        aria-label="Imaginea anterioară"
      >
        <MoveLeft className="w-5 h-5" />
      </button>
    );
  }, []);

  const renderRightNav = useCallback((onClick: (e: MouseEvent<HTMLElement>) => void, disabled: boolean) => {
    return (
      <button
        className="image-gallery-icon image-gallery-right-nav absolute right-4 top-1/2 -translate-y-1/2 z-10"
        onClick={onClick}
        disabled={disabled}
        aria-label="Următoarea imagine"
      >
        <MoveRight className="w-5 h-5" />
      </button>
    );
  }, []);

  // Effect to handle body scroll
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center">
      <div className={`relative w-full max-w-5xl h-[85vh] ${className}`}>
        <ReactImageGallery
          ref={galleryRef}
          items={items}
          showPlayButton={false}
          showFullscreenButton={false}
          showNav={true}
          showThumbnails={true}
          showBullets={true}
          thumbnailPosition="bottom"
          infinite={false}
          slideDuration={0}
          slideInterval={3000}
          startIndex={currentIndex}
          useTranslate3D={true}
          useBrowserFullscreen={false}
          onSlide={(index) => {
            setCurrentIndex(index);
          }}
          renderLeftNav={renderLeftNav}
          renderRightNav={renderRightNav}
          additionalClass="image-gallery-custom"
          disableSwipe={true}
          lazyLoad={false}
          stopPropagation={true}
        />
        {/* Buton de închidere */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          aria-label="Închide galeria"
        >
          ✕
        </button>
        {/* Counter pentru imagini */}
        <div className="absolute bottom-24 left-4 text-white z-10 font-medium">
          {currentIndex + 1} / {items.length}
        </div>
      </div>
    </div>
  );
};

export default ImageGallery;