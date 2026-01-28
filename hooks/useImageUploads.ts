import { useState } from 'react';
import { uploadListingImages } from '@/lib/api/listings';

type UseImageUploadsOptions = {
  onError?: (message: string) => void;
  inviteToken?: string | null;
};

export default function useImageUploads({ onError, inviteToken }: UseImageUploadsOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const upload = async (listingId: string, files: File[], startIndex = 0) => {
    if (files.length === 0) return { uploaded: [] as any[] };
    setUploading(true);
    setUploadedCount(0);
    try {
      const MAX_BATCH_BYTES = 4 * 1024 * 1024; // keep under platform request limits
      const oversized = files.filter((f) => typeof f.size === 'number' && f.size > MAX_BATCH_BYTES);
      if (oversized.length > 0) {
        const err = new Error('Unele imagini sunt prea mari pentru upload. Incearca imagini mai mici.');
        (err as any).failed = oversized.map((f) => ({ name: f.name, reason: 'file_too_large' }));
        throw err;
      }

      let uploadedAll: any[] = [];
      let batch: File[] = [];
      let batchBytes = 0;
      let currentIndex = startIndex;

      const flushBatch = async () => {
        if (batch.length === 0) return;
        const body = await uploadListingImages(listingId, batch, currentIndex, inviteToken);
        const uploaded = body.uploaded || [];
        uploadedAll = uploadedAll.concat(uploaded);
        setUploadedCount((prev) => prev + uploaded.length);
        currentIndex += batch.length;
        batch = [];
        batchBytes = 0;
      };

      for (const file of files) {
        const size = typeof file.size === 'number' ? file.size : 0;
        if (batch.length > 0 && batchBytes + size > MAX_BATCH_BYTES) {
          await flushBatch();
        }
        batch.push(file);
        batchBytes += size;
      }
      await flushBatch();

      return { uploaded: uploadedAll };
    } catch (err: any) {
      onError?.(err?.message || 'Eroare la incarcarea imaginilor');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadedCount, upload };
}
