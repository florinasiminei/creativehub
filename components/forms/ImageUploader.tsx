import React from 'react';
import ImageDropzone from './ImageDropzone';
import SelectedImagesGrid from './SelectedImagesGrid';
import ExistingImagesGrid from './ExistingImagesGrid';
import FormMessage from './FormMessage';

type ExistingImage = { id: string; image_url: string; alt?: string | null };

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
}: ImageUploaderProps) {
  const totalSelected = files.length + (existingImages?.length ?? 0);
  const maxAllowed = 12;
  const overLimit = totalSelected > maxAllowed;

  return (
    <div className="space-y-4">
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
          Ai in total {totalSelected} imagini. Pentru publicare trebuie sa ramai cu maximum {maxAllowed}. Sterge {totalSelected - maxAllowed}.
        </FormMessage>
      )}

      {existingImages.length > 0 && existingTitle && existingSubtitle && onExistingDragStart && onExistingDragOver && onExistingDragEnd && onExistingMove && onExistingDelete && (
        <ExistingImagesGrid
          title={existingTitle}
          subtitle={existingSubtitle}
          images={existingImages}
          draggingIdx={existingDraggingIdx ?? null}
          onDragStart={onExistingDragStart}
          onDragOver={onExistingDragOver}
          onDragEnd={onExistingDragEnd}
          onMove={onExistingMove}
          onDelete={onExistingDelete}
        />
      )}

      <SelectedImagesGrid
        title={selectedTitle}
        subtitle={selectedSubtitle}
        files={files}
        previews={previews}
        draggingIdx={draggingIdx}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onMove={onMove}
        onRemove={onRemove}
        failedNames={selectedFailedNames}
      />
    </div>
  );
}
