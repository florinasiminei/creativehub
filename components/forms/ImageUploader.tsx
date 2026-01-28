import React from 'react';
import ImageDropzone from './ImageDropzone';
import SelectedImagesGrid from './SelectedImagesGrid';
import ExistingImagesGrid from './ExistingImagesGrid';

type ExistingImage = { id: string; image_url: string; alt?: string | null };

type ImageUploaderProps = {
  dropzoneTitle: string;
  dropzoneSubtitle: string;
  dropzoneHelper: string;
  accept: string;
  isActive: boolean;
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
  return (
    <div className="space-y-4">
      <ImageDropzone
        title={dropzoneTitle}
        subtitle={dropzoneSubtitle}
        helper={dropzoneHelper}
        accept={accept}
        isActive={isActive}
        onActiveChange={onActiveChange}
        onFilesSelected={onFilesSelected}
      />

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
      />
    </div>
  );
}
