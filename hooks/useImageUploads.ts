import { useState } from 'react';
import { uploadListingImages } from '@/lib/api/listings';

type UseImageUploadsOptions = {
  onError?: (message: string) => void;
};

export default function useImageUploads({ onError }: UseImageUploadsOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const upload = async (listingId: string, files: File[], startIndex = 0) => {
    if (files.length === 0) return { uploaded: [] as any[] };
    setUploading(true);
    setUploadedCount(0);
    try {
      const body = await uploadListingImages(listingId, files, startIndex);
      const uploaded = body.uploaded || [];
      setUploadedCount(uploaded.length);
      return { uploaded };
    } catch (err: any) {
      onError?.(err?.message || 'Eroare la incarcarea imaginilor');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadedCount, upload };
}
