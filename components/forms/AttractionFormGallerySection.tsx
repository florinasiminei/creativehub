'use client';

import ImageUploader from '@/components/forms/ImageUploader';
import ListingFormSection from '@/components/forms/ListingFormSection';
import type { AttractionImage } from '@/lib/attractions/attractionForm';

type AttractionFormGallerySectionProps = {
  step: string;
  showValidation: boolean;
  files: File[];
  previews: string[];
  draggingIdx: number | null;
  isDropActive: boolean;
  onDropActiveChange: (active: boolean) => void;
  onFilesSelected: (files: File[]) => void;
  onDragStart: (idx: number) => void;
  onDragOver: (idx: number) => void;
  onDragEnd: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: (idx: number) => void;
  selectedFailedNames?: string[];
  existingImages?: AttractionImage[];
  existingDraggingIdx?: number | null;
  onExistingDragStart?: (idx: number) => void;
  onExistingDragOver?: (idx: number) => void;
  onExistingDragEnd?: () => void;
  onExistingMove?: (from: number, to: number) => void;
  onExistingDelete?: (image: AttractionImage) => void;
};

export default function AttractionFormGallerySection({
  step,
  showValidation,
  files,
  previews,
  draggingIdx,
  isDropActive,
  onDropActiveChange,
  onFilesSelected,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMove,
  onRemove,
  selectedFailedNames = [],
  existingImages = [],
  existingDraggingIdx,
  onExistingDragStart,
  onExistingDragOver,
  onExistingDragEnd,
  onExistingMove,
  onExistingDelete,
}: AttractionFormGallerySectionProps) {
  return (
    <ListingFormSection step={step} label="Galerie" title="Poze atracție">
      <ImageUploader
        dropzoneTitle="Incarca imagini (minim 1, maxim 12)"
        dropzoneSubtitle="Accepta .jpg, .png, .webp, .avif, .heic"
        dropzoneHelper="Click sau trage imaginile aici"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/heic,image/heif,image/*"
        isActive={isDropActive}
        isInvalid={showValidation && files.length + existingImages.length < 1}
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
        selectedTitle="Ordinea galeriei"
        selectedSubtitle="Trage sau foloseste sagetile pentru ordinea de afisare"
        selectedFailedNames={selectedFailedNames}
        existingImages={existingImages}
        existingTitle="Galeria actuala"
        existingSubtitle="Reordoneaza sau sterge imaginile deja salvate"
        existingDraggingIdx={existingDraggingIdx}
        onExistingDragStart={onExistingDragStart}
        onExistingDragOver={onExistingDragOver}
        onExistingDragEnd={onExistingDragEnd}
        onExistingMove={onExistingMove}
        onExistingDelete={onExistingDelete}
        maxAllowed={12}
      />
    </ListingFormSection>
  );
}
