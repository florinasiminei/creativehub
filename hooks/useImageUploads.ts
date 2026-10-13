import { useState } from 'react';
import { uploadListingFile } from '@/lib/api/listings';
import { uploadOwnerListingFile } from '@/lib/api/ownerListings';
import { uploadImageBatch } from '@/lib/imageUploadFlow';

type UseImageUploadsOptions = {
  onError?: (message: string) => void;
  listingToken?: string | null;
  expectedOwnerId?: string;
};

export default function useImageUploads({ onError, listingToken, expectedOwnerId }: UseImageUploadsOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const upload = async (listingId: string, files: File[], startIndex = 0, tokenOverride?: string | null) => {
    if (files.length === 0) return { uploaded: [] as any[] };

    setUploading(true);
    setUploadedCount(0);

    try {
      const activeToken = tokenOverride ?? listingToken ?? null;
      return await uploadImageBatch({
        files,
        startIndex,
        uploadFile: (file, displayOrder) => expectedOwnerId
          ? uploadOwnerListingFile(listingId, file, displayOrder, expectedOwnerId)
          : uploadListingFile(listingId, file, displayOrder, activeToken),
        onUploaded: () => setUploadedCount((prev) => prev + 1),
      });
    } catch (error: any) {
      onError?.(error?.message || 'Eroare la incarcarea imaginilor');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadedCount, upload };
}
