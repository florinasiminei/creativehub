'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useImageSelection from '@/hooks/useImageSelection';
import { deleteOwnerListingImage, uploadOwnerListingFile } from '@/lib/api/ownerListings';
import { uploadImageBatch } from '@/lib/imageUploadFlow';
import type { ExistingImage as ListingImage } from '@/lib/listings/listingForm';
import {
  getListingImageFileError,
  LISTING_SUBMISSION_LIMITS,
} from '@/lib/listings/listingSubmissionRules';
import {
  createPendingImageId,
  mapUploadedImages,
  moveToken,
  type UploadResult,
} from './add-property-model';

type GalleryFeedback = {
  clearFeedback: () => void;
  setError: (message: string) => void;
  setUploadError: (error: unknown) => void;
};

type PartialUploadError = Error & {
  uploaded?: UploadResult[];
  uploadedIndices?: number[];
};

const MAX_IMAGES = LISTING_SUBMISSION_LIMITS.maxImages;

export default function useAddPropertyGallery({
  clearFeedback,
  setError,
  setUploadError,
}: GalleryFeedback) {
  const [images, setImages] = useState<ListingImage[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [galleryOrder, setGalleryOrder] = useState<string[]>([]);
  const [draggingExistingIdx, setDraggingExistingIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const {
    files,
    filePreviews,
    draggingIdx,
    isDropActive,
    setIsDropActive,
    moveFile,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    resetFiles,
    setFiles,
  } = useImageSelection({
    maxFiles: Number.POSITIVE_INFINITY,
    onLimit: setError,
  });

  const imagesRef = useRef<ListingImage[]>([]);
  const filesRef = useRef<File[]>([]);
  const pendingIdsRef = useRef<string[]>([]);
  const galleryOrderRef = useRef<string[]>([]);
  const uploadPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const updateImages = useCallback((updater: (current: ListingImage[]) => ListingImage[]) => {
    const next = updater(imagesRef.current);
    imagesRef.current = next;
    setImages(next);
  }, []);

  const replacePendingQueue = useCallback((nextPendingIds: string[]) => {
    const fileByPendingId = new Map(
      pendingIdsRef.current.map((id, index) => [id, filesRef.current[index]] as const),
    );
    const nextFiles = nextPendingIds
      .map((id) => fileByPendingId.get(id))
      .filter((file): file is File => Boolean(file));

    pendingIdsRef.current = nextPendingIds;
    filesRef.current = nextFiles;
    setPendingIds(nextPendingIds);
    setFiles(nextFiles);
  }, [setFiles]);

  const syncOrder = useCallback((nextOrder: string[]) => {
    const fileByPendingId = new Map(
      pendingIdsRef.current.map((id, index) => [id, filesRef.current[index]] as const),
    );
    const nextPendingIds = nextOrder
      .filter((token) => token.startsWith('pending:'))
      .map((token) => token.slice('pending:'.length))
      .filter((id) => fileByPendingId.has(id));
    const nextFiles = nextPendingIds
      .map((id) => fileByPendingId.get(id))
      .filter((file): file is File => Boolean(file));

    const imageById = new Map(imagesRef.current.map((image) => [image.id, image] as const));
    const nextImages = nextOrder
      .filter((token) => token.startsWith('saved:'))
      .map((token) => imageById.get(token.slice('saved:'.length)))
      .filter((image): image is ListingImage => Boolean(image));

    pendingIdsRef.current = nextPendingIds;
    filesRef.current = nextFiles;
    imagesRef.current = nextImages;
    setPendingIds(nextPendingIds);
    setFiles(nextFiles);
    setImages(nextImages);
  }, [setFiles]);

  const applyGalleryOrder = useCallback((updater: (current: string[]) => string[]) => {
    const next = updater(galleryOrderRef.current);
    galleryOrderRef.current = next;
    setGalleryOrder(next);
    syncOrder(next);
  }, [syncOrder]);

  const appendUploadedImages = useCallback((
    uploaded: UploadResult[],
    uploadedPendingIds: string[],
  ) => {
    if (uploaded.length === 0) return;
    const mapped = mapUploadedImages(uploaded);
    updateImages((current) => [...current, ...mapped]);
    applyGalleryOrder((current) => {
      const next = [...current];
      mapped.forEach((image, index) => {
        const pendingToken = uploadedPendingIds[index]
          ? `pending:${uploadedPendingIds[index]}`
          : null;
        const savedToken = `saved:${image.id}`;
        const pendingIndex = pendingToken ? next.indexOf(pendingToken) : -1;
        if (pendingIndex >= 0) next[pendingIndex] = savedToken;
        else next.push(savedToken);
      });
      return next;
    });
  }, [applyGalleryOrder, updateImages]);

  const handleFilesSelected = useCallback((incoming: File[]) => {
    if (incoming.length === 0) return;
    clearFeedback();

    const validFiles: File[] = [];
    let firstError: string | null = null;
    incoming.forEach((file) => {
      const error = getListingImageFileError(file);
      if (error) {
        if (!firstError) firstError = `${file.name}: ${error}`;
        return;
      }
      validFiles.push(file);
    });
    if (firstError) setError(firstError);

    const remainingSlots = Math.max(
      0,
      MAX_IMAGES - (imagesRef.current.length + filesRef.current.length),
    );
    if (remainingSlots === 0) {
      setError(`Poți încărca maximum ${MAX_IMAGES} imagini.`);
      return;
    }

    const acceptedFiles = validFiles.slice(0, remainingSlots);
    if (acceptedFiles.length < validFiles.length) {
      setError(`Poți încărca maximum ${MAX_IMAGES} imagini.`);
    }
    if (acceptedFiles.length === 0) return;

    const nextPendingIds = acceptedFiles.map(createPendingImageId);
    setFiles((current) => {
      const next = [...current, ...acceptedFiles];
      filesRef.current = next;
      return next;
    });
    setPendingIds((current) => {
      const next = [...current, ...nextPendingIds];
      pendingIdsRef.current = next;
      return next;
    });
    setGalleryOrder((current) => {
      const next = [...current, ...nextPendingIds.map((id) => `pending:${id}`)];
      galleryOrderRef.current = next;
      return next;
    });
  }, [clearFeedback, setError, setFiles]);

  const removePendingAtIndex = useCallback((index: number) => {
    const pendingId = pendingIdsRef.current[index];
    if (!pendingId) return;
    replacePendingQueue(pendingIdsRef.current.filter((id) => id !== pendingId));
    applyGalleryOrder((current) => current.filter((token) => token !== `pending:${pendingId}`));
  }, [applyGalleryOrder, replacePendingQueue]);

  const moveGalleryToken = useCallback((token: string, direction: -1 | 1) => {
    applyGalleryOrder((current) => {
      const fromIndex = current.indexOf(token);
      return moveToken(current, fromIndex, fromIndex + direction);
    });
  }, [applyGalleryOrder]);

  const reorderGalleryToken = useCallback((token: string, toIndex: number) => {
    applyGalleryOrder((current) => moveToken(current, current.indexOf(token), toIndex));
  }, [applyGalleryOrder]);

  const deleteExistingImage = useCallback(async (
    image: ListingImage,
    expectedOwnerId: string | null,
  ) => {
    if (!expectedOwnerId) {
      setError('Confirmă din nou contul proprietarului înainte de a șterge imaginea.');
      return false;
    }

    try {
      await deleteOwnerListingImage(image.id, expectedOwnerId);
      updateImages((current) => current.filter((item) => item.id !== image.id));
      applyGalleryOrder((current) => current.filter((token) => token !== `saved:${image.id}`));
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nu am putut șterge imaginea.');
      return false;
    }
  }, [applyGalleryOrder, setError, updateImages]);

  const deleteGalleryToken = useCallback(async (
    token: string,
    expectedOwnerId: string | null,
  ) => {
    if (token.startsWith('saved:')) {
      const image = imagesRef.current.find(
        (item) => item.id === token.slice('saved:'.length),
      );
      if (image) await deleteExistingImage(image, expectedOwnerId);
      return;
    }

    if (!token.startsWith('pending:')) return;
    const pendingId = token.slice('pending:'.length);
    const index = pendingIdsRef.current.indexOf(pendingId);
    if (index >= 0) removePendingAtIndex(index);
  }, [deleteExistingImage, removePendingAtIndex]);

  const uploadPendingFiles = useCallback(async (
    listingId: string,
    expectedOwnerId: string,
  ) => {
    if (uploadPromiseRef.current) return uploadPromiseRef.current;

    const fileSnapshot = filesRef.current.slice();
    if (fileSnapshot.length === 0) return;
    const pendingIdSnapshot = pendingIdsRef.current.slice(0, fileSnapshot.length);

    const uploadPromise = (async () => {
      setUploading(true);
      setUploadedCount(0);
      try {
        const result = await uploadImageBatch<UploadResult>({
          files: fileSnapshot,
          startIndex: imagesRef.current.length,
          uploadFile: (file, displayOrder) =>
            uploadOwnerListingFile(
              listingId,
              file,
              displayOrder,
              expectedOwnerId,
            ),
          onUploaded: () => setUploadedCount((current) => current + 1),
        });
        appendUploadedImages(result.uploaded, pendingIdSnapshot);
        replacePendingQueue(
          pendingIdsRef.current.filter((id) => !pendingIdSnapshot.includes(id)),
        );
        clearFeedback();
      } catch (caught) {
        const error = caught as PartialUploadError;
        const uploaded = Array.isArray(error.uploaded) ? error.uploaded : [];
        const uploadedIndices = Array.isArray(error.uploadedIndices)
          ? error.uploadedIndices
          : [];
        const uploadedPendingIds = uploadedIndices
          .map((index) => pendingIdSnapshot[index])
          .filter((id): id is string => Boolean(id));
        appendUploadedImages(uploaded, uploadedPendingIds);
        replacePendingQueue(
          pendingIdsRef.current.filter((id) => !uploadedPendingIds.includes(id)),
        );
        setUploadError(error);
        throw error;
      } finally {
        setUploading(false);
        uploadPromiseRef.current = null;
      }
    })();

    uploadPromiseRef.current = uploadPromise;
    return uploadPromise;
  }, [appendUploadedImages, clearFeedback, replacePendingQueue, setUploadError]);

  const resetGallery = useCallback(() => {
    resetFiles();
    filesRef.current = [];
    imagesRef.current = [];
    pendingIdsRef.current = [];
    galleryOrderRef.current = [];
    setImages([]);
    setPendingIds([]);
    setGalleryOrder([]);
    setDraggingExistingIdx(null);
    setUploadedCount(0);
  }, [resetFiles]);

  const moveExistingImage = useCallback((from: number, to: number) => {
    applyGalleryOrder((current) => {
      const savedTokens = current.filter((token) => token.startsWith('saved:'));
      const fromToken = savedTokens[from];
      const toToken = savedTokens[to];
      if (!fromToken || !toToken) return current;
      return moveToken(current, current.indexOf(fromToken), current.indexOf(toToken));
    });
  }, [applyGalleryOrder]);

  const getOrderedImageIds = useCallback(
    () => galleryOrderRef.current
      .filter((token) => token.startsWith('saved:'))
      .map((token) => token.slice('saved:'.length)),
    [],
  );

  return {
    files,
    filePreviews,
    images,
    pendingIds,
    galleryOrder,
    draggingIdx,
    draggingExistingIdx,
    isDropActive,
    uploading,
    uploadedCount,
    totalImages: files.length + images.length,
    setIsDropActive,
    handleFilesSelected,
    moveFile,
    removeFile: removePendingAtIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    moveGalleryToken,
    reorderGalleryToken,
    deleteGalleryToken,
    setDraggingExistingIdx,
    moveExistingImage,
    deleteExistingImage,
    uploadPendingFiles,
    getOrderedImageIds,
    resetGallery,
    isUploadInProgress: () => Boolean(uploadPromiseRef.current),
  };
}
