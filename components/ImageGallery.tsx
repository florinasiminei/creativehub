"use client";

import React, { useState, MouseEvent, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import ReactImageGallery from "react-image-gallery";
import { MoveLeft, MoveRight, X } from "lucide-react";
import "react-image-gallery/styles/css/image-gallery.css";

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

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  className = "",
  title,
  onClose,
  startIndex = 0,
}) => {
  const safeImages = images?.length ? images : ["/fallback.jpg"];
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isMobile, setIsMobile] = useState(false);
  const galleryRef = React.useRef<any>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    setCurrentIndex(startIndex);
    if (galleryRef.current?.slideToIndex) {
      galleryRef.current.slideToIndex(startIndex, false);
    }
  }, [startIndex]);

  const items = useMemo(
    () =>
      safeImages.map((url) => ({
        original: url,
        thumbnail: url,
        thumbnailHeight: 64,
        thumbnailWidth: 96,
        description: title ? `${title} - Imagine` : "Imagine proprietate",
        renderItem: (item: GalleryItemCustom) => (
          <div className="relative flex h-full w-full items-center justify-center bg-black">
            <Image
              src={item.original}
              alt={item.description || ""}
              fill
              sizes="100vw"
              className={isMobile ? "object-contain" : "object-cover"}
            />
          </div>
        ),
        renderThumbInner: (item: GalleryItemCustom) => (
          <div className="relative h-full w-full">
            <Image
              src={item.thumbnail}
              alt="Miniatura"
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
        ),
      })),
    [safeImages, title, isMobile]
  );

  const renderLeftNav = useCallback(
    (onClick: (e: MouseEvent<HTMLElement>) => void, disabled: boolean) => {
      if (isMobile) return null;

      return (
        <button
          className="image-gallery-icon image-gallery-left-nav absolute left-4 top-1/2 z-10 -translate-y-1/2"
          onClick={onClick}
          disabled={disabled}
          aria-label="Imaginea anterioara"
        >
          <MoveLeft className="h-5 w-5" />
        </button>
      );
    },
    [isMobile]
  );

  const renderRightNav = useCallback(
    (onClick: (e: MouseEvent<HTMLElement>) => void, disabled: boolean) => {
      if (isMobile) return null;

      return (
        <button
          className="image-gallery-icon image-gallery-right-nav absolute right-4 top-1/2 z-10 -translate-y-1/2"
          onClick={onClick}
          disabled={disabled}
          aria-label="Urmatoarea imagine"
        >
          <MoveRight className="h-5 w-5" />
        </button>
      );
    },
    [isMobile]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className={`relative h-[100dvh] w-full md:h-[85vh] md:max-w-5xl ${className}`}>
        <ReactImageGallery
          ref={galleryRef}
          items={items}
          showPlayButton={false}
          showFullscreenButton={false}
          showNav={!isMobile}
          showThumbnails={!isMobile}
          showBullets={isMobile && items.length > 1}
          thumbnailPosition="bottom"
          infinite
          slideDuration={0}
          slideInterval={4000}
          startIndex={currentIndex}
          useTranslate3D
          useBrowserFullscreen={false}
          onSlide={(index) => setCurrentIndex(index)}
          renderLeftNav={renderLeftNav}
          renderRightNav={renderRightNav}
          additionalClass={`image-gallery-custom ${isMobile ? "image-gallery--mobile" : ""}`}
          disableSwipe={!isMobile}
          lazyLoad={false}
          stopPropagation={true}
        />

        {/* Buton de inchidere */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
          aria-label="Inchide galeria"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Counter pentru imagini */}
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1 text-xs font-medium text-white md:left-4 md:translate-x-0 md:text-sm">
          {currentIndex + 1} / {items.length}
        </div>
      </div>
    </div>
  );
};

export default ImageGallery;
