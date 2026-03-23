import React from 'react';
import ImageDropzone from './ImageDropzone';
import UnifiedGalleryGrid from './UnifiedGalleryGrid';
import FormMessage from './FormMessage';

type ExistingImage = { id: string; image_url: string; alt?: string | null; preview_url?: string | null };

type ImageUploaderProps = {
  dropzoneTitle: string;
  dropzoneSubtitle: string;
  dropzoneHelper: string;
  accept: string;
  isActive: boolean;
  isInvalid?: boolean;
  onActiveChange: (active: boolean) => void;
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
  selectedTitle: string;
  selectedSubtitle: string;
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
  maxAllowed?: number;
};

export default function ImageUploader({
  dropzoneTitle,
  dropzoneSubtitle,
  dropzoneHelper,
  accept,
  isActive,
  isInvalid = false,
  onActiveChange,
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
  selectedTitle,
  selectedSubtitle,
  selectedFailedNames = [],
  existingImages = [],
  existingTitle,
  existingSubtitle,
  existingDraggingIdx,
  onExistingDragStart,
  onExistingDragOver,
  onExistingDragEnd,
  onExistingMove,
  onExistingDelete,
  maxAllowed = 12,
}: ImageUploaderProps) {
  const totalSelected = files.length + (existingImages?.length ?? 0);
  const overLimit = totalSelected > maxAllowed;

  return (
    <div className="space-y-5">
      <ImageDropzone
        title={dropzoneTitle}
        subtitle={dropzoneSubtitle}
        helper={dropzoneHelper}
        accept={accept}
        isActive={isActive}
        isInvalid={isInvalid}
        onActiveChange={onActiveChange}
        onFilesSelected={onFilesSelected}
      />

      {overLimit && (
        <FormMessage variant="warning" size="sm">
          Ai in total {totalSelected} imagini. Pentru publicare trebuie sa ramai cu maximum {maxAllowed}. Sterge{' '}
          {totalSelected - maxAllowed}.
        </FormMessage>
      )}

      <UnifiedGalleryGrid
        title={existingImages.length > 0 ? existingTitle || selectedTitle : selectedTitle}
        subtitle={existingImages.length > 0 ? existingSubtitle || selectedSubtitle : selectedSubtitle}
        files={files}
        previews={previews}
        draggingIdx={draggingIdx}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onMove={onMove}
        onRemove={onRemove}
        locked={selectedImagesLocked}
        failedNames={selectedFailedNames}
        galleryOrder={galleryOrder}
        pendingIds={pendingImageIds}
        onMoveToken={onMoveGalleryToken}
        onReorderToken={onReorderGalleryToken}
        onDeleteToken={onDeleteGalleryToken}
        existingImages={existingImages}
        existingDraggingIdx={existingDraggingIdx ?? null}
        onExistingDragStart={onExistingDragStart}
        onExistingDragOver={onExistingDragOver}
        onExistingDragEnd={onExistingDragEnd}
        onExistingMove={onExistingMove}
        onExistingDelete={onExistingDelete}
      />
    </div>
  );
}
