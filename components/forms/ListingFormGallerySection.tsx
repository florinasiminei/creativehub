"use client";

import ImageUploader from "./ImageUploader";
import ListingFormSection from "./ListingFormSection";
import type { ExistingImage } from "./listingFormTypes";

type ListingFormGallerySectionProps = {
  dropzoneTitle: string;
  dropzoneSubtitle: string;
  dropzoneHelper: string;
  showValidation: boolean;
  imagesInvalid: boolean;
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
    <ListingFormSection step="pas 3" label="Galerie" title="Galerie foto" mobileFlat>
      <ImageUploader
        dropzoneTitle={dropzoneTitle}
        dropzoneSubtitle={dropzoneSubtitle}
        dropzoneHelper={dropzoneHelper}
        maxAllowed={maxImagesWarning}
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/heic,image/heif,image/*"
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
