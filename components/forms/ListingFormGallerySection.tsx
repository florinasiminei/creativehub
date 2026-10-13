"use client";

import ImageUploader from "./ImageUploader";
import FormMessage from "./FormMessage";
import ListingFormSection from "./ListingFormSection";
import type { ExistingImage } from "./listingFormTypes";

type ListingFormGallerySectionProps = {
  dropzoneTitle: string;
  dropzoneSubtitle: string;
  dropzoneHelper: string;
  showValidation: boolean;
  imagesInvalid: boolean;
  imagesError?: string | null;
  stepLabel?: string;
  wizardStep?: boolean;
  minimumImagesRequired?: number;
  isDropActive: boolean;
  onDropActiveChange: (active: boolean) => void;
  onFilesSelected: (files: File[]) => void;
  files: File[];
  previews: string[];
  draggingIdx: number | null;
  onDragStart: (idx: number) => void;
  onDragOver: (idx: number) => void;
  onDragEnd: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: (idx: number) => void;
  selectedImagesLocked?: boolean;
  galleryOrder?: string[];
  pendingImageIds?: string[];
  onMoveGalleryToken?: (token: string, direction: -1 | 1) => void;
  onReorderGalleryToken?: (token: string, toIndex: number) => void;
  onDeleteGalleryToken?: (token: string) => void;
  selectedImagesTitle: string;
  selectedImagesSubtitle: string;
  selectedFailedNames?: string[];
  existingImages?: ExistingImage[];
  existingTitle?: string;
  existingSubtitle?: string;
  existingDraggingIdx?: number | null;
  onExistingDragStart?: (idx: number) => void;
  onExistingDragOver?: (idx: number) => void;
  onExistingDragEnd?: () => void;
  onExistingMove?: (from: number, to: number) => void;
  onExistingDelete?: (img: ExistingImage) => void;
  maxImagesWarning?: number;
};

export default function ListingFormGallerySection({
  dropzoneTitle,
  dropzoneSubtitle,
  dropzoneHelper,
  showValidation,
  imagesInvalid,
  imagesError = null,
  stepLabel = "pas 3",
  wizardStep = false,
  minimumImagesRequired = 5,
  isDropActive,
  onDropActiveChange,
  onFilesSelected,
  files,
  previews,
  draggingIdx,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMove,
  onRemove,
  selectedImagesLocked = false,
  galleryOrder,
  pendingImageIds,
  onMoveGalleryToken,
  onReorderGalleryToken,
  onDeleteGalleryToken,
  selectedImagesTitle,
  selectedImagesSubtitle,
  selectedFailedNames = [],
  existingImages = [],
  existingTitle,
  existingSubtitle,
  existingDraggingIdx = null,
  onExistingDragStart,
  onExistingDragOver,
  onExistingDragEnd,
  onExistingMove,
  onExistingDelete,
  maxImagesWarning,
}: ListingFormGallerySectionProps) {
  return (
    <ListingFormSection step={stepLabel} label="Galerie" title="Galerie foto" mobileFlat>
      {wizardStep && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {minimumImagesRequired > 0
            ? `Adaugă între ${minimumImagesRequired} și ${maxImagesWarning || 30} de fotografii reale. `
            : `Poți adăuga până la ${maxImagesWarning || 30} de fotografii reale. `}
          Sunt acceptate JPEG, PNG, WebP și AVIF, maximum 15 MB fiecare.
        </p>
      )}
      {showValidation && imagesInvalid && imagesError && (
        <FormMessage variant="error">{imagesError}</FormMessage>
      )}
      <ImageUploader
        dropzoneTitle={dropzoneTitle}
        dropzoneSubtitle={dropzoneSubtitle}
        dropzoneHelper={dropzoneHelper}
        maxAllowed={maxImagesWarning}
        accept="image/jpeg,image/png,image/webp,image/avif"
        isActive={isDropActive}
        isInvalid={showValidation && imagesInvalid}
        onActiveChange={onDropActiveChange}
        onFilesSelected={onFilesSelected}
        files={files}
        previews={previews}
        draggingIdx={draggingIdx}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onMove={onMove}
        onRemove={onRemove}
        selectedImagesLocked={selectedImagesLocked}
        galleryOrder={galleryOrder}
        pendingImageIds={pendingImageIds}
        onMoveGalleryToken={onMoveGalleryToken}
        onReorderGalleryToken={onReorderGalleryToken}
        onDeleteGalleryToken={onDeleteGalleryToken}
        selectedTitle={selectedImagesTitle}
        selectedSubtitle={selectedImagesSubtitle}
        selectedFailedNames={selectedFailedNames}
        existingImages={existingImages}
        existingTitle={existingTitle}
        existingSubtitle={existingSubtitle}
        existingDraggingIdx={existingDraggingIdx}
        onExistingDragStart={onExistingDragStart}
        onExistingDragOver={onExistingDragOver}
        onExistingDragEnd={onExistingDragEnd}
        onExistingMove={onExistingMove}
        onExistingDelete={onExistingDelete}
      />
    </ListingFormSection>
  );
}
