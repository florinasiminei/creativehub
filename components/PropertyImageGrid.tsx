"use client";

// React
import React, { useState } from 'react';

// Next.js
import Image from 'next/image';

// Components
import ImageGallery from './ImageGallery';

// Icons
import { Camera } from 'lucide-react';

interface PropertyImageGridProps {
  images: string[];
  title?: string;
  className?: string;
}

const PropertyImageGrid: React.FC<PropertyImageGridProps> = ({ images, title, className }) => {
  const [showGallery, setShowGallery] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const openGallery = (index: number) => {
    setStartIndex(index);
    setShowGallery(true);
  };

  // Handle ESC key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowGallery(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!images || images.length === 0) {
    return null;
  }

  // Display up to 5 images in the desktop grid for preview, but keep all images for gallery
  const gridImages = images.slice(0, 5);
  const remainingCount = Math.max(0, images.length - 5);

  return (
    <>
      {/* Desktop grid */}
      <div
        className={`hidden md:grid grid-cols-4 gap-2 h-[480px] rounded-2xl overflow-hidden ${className}`}
      >
        {/* Main large image */}
        <div 
          className="col-span-2 row-span-2 relative group cursor-pointer"
          onClick={() => openGallery(0)}
        >
          <Image
            src={images[0]}
            alt={title ? `${title} - Imagine principala` : 'Imagine principala'}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
        </div>

        {/* Grid of smaller images */}
        {gridImages.slice(1).map((url: string, index: number) => (
          <div
            key={url}
            className="relative group cursor-pointer overflow-hidden"
            onClick={() => openGallery(index + 1)}
          >
            <Image
              src={url}
              alt={`${title || 'Proprietate'} - Imagine ${index + 2}`}
              fill
              sizes="25vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
            
            {/* Show remaining count on last visible image */}
            {index === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
                <div className="text-white text-center">
                  <Camera className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-sm font-medium">+{remainingCount} poze</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile swipeable carousel */}
      <div className="md:hidden -mx-6">
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-6 pb-4 scrollbar-hide">
          {images.map((url: string, index: number) => (
            <div
              key={url}
              className="relative flex-shrink-0 snap-center snap-always w-[85vw] aspect-[4/3] rounded-2xl overflow-hidden shadow-sm cursor-pointer"
              onClick={() => openGallery(index)}
            >
              <Image
                src={url}
                alt={`${title || 'Locatie'} - Imagine ${index + 1}`}
                fill
                sizes="90vw"
                className="object-cover"
                priority={index === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full font-medium">
                {index + 1} / {images.length}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Show button for mobile */}
      <button
        onClick={() => openGallery(0)}
        className="md:hidden mt-4 flex items-center gap-2 text-sm bg-white dark:bg-zinc-800 border px-4 py-2 rounded-lg shadow-sm w-full justify-center"
      >
        <Camera className="w-4 h-4" />
        Vezi toate pozele ({images.length})
      </button>

      {/* Full gallery modal */}
      {showGallery && (
        <ImageGallery
          images={images.slice()} // Create a new array to ensure all images are passed
          title={title}
          className="w-full h-full"
          startIndex={startIndex}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  );
};

export default PropertyImageGrid;
