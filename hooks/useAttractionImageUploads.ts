import { useState } from 'react';
import { uploadAttractionFile } from '@/lib/api/attractions';
import { uploadImageBatch } from '@/lib/imageUploadFlow';

type UseAttractionImageUploadsOptions = {
  onError?: (message: string) => void;
  inviteToken?: string | null;
};

export default function useAttractionImageUploads({
  onError,
  inviteToken,
}: UseAttractionImageUploadsOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const upload = async (attractionId: string, files: File[], startIndex = 0, tokenOverride?: string | null) => {
    if (files.length === 0) return { uploaded: [] as any[] };

    setUploading(true);
    setUploadedCount(0);

    try {
      const activeToken = tokenOverride ?? inviteToken ?? null;
      return await uploadImageBatch({
        files,
        startIndex,
        uploadFile: (file, displayOrder) =>
          uploadAttractionFile(attractionId, file, displayOrder, activeToken),
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
