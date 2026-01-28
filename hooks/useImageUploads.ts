import { useState } from 'react';
import { uploadListingImages } from '@/lib/api/listings';

type UseImageUploadsOptions = {
  onError?: (message: string) => void;
  inviteToken?: string | null;
};

export default function useImageUploads({ onError, inviteToken }: UseImageUploadsOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const compressImage = async (file: File, targetBytes: number) => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
    if (typeof window === 'undefined') return file;
    if (file.size <= targetBytes) return file;

    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return file;
    }

    const maxWidth = 2400;
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const qualities = [0.82, 0.74, 0.66, 0.58];
    for (const q of qualities) {
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/webp', q)
      );
      if (!blob) continue;
      if (blob.size <= targetBytes) {
        return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
      }
    }

    return file;
  };

  const upload = async (listingId: string, files: File[], startIndex = 0) => {
    if (files.length === 0) return { uploaded: [] as any[] };
    setUploading(true);
    setUploadedCount(0);
    try {
      const MAX_BATCH_BYTES = 3.5 * 1024 * 1024; // keep under platform request limits
      const TARGET_FILE_BYTES = 1.8 * 1024 * 1024;

      const failed: Array<{ name: string; reason: string }> = [];
      const prepared: File[] = [];
      for (const f of files) {
        const processed = await compressImage(f, TARGET_FILE_BYTES);
        if (processed.size > MAX_BATCH_BYTES) {
          failed.push({ name: f.name, reason: 'file_too_large' });
          continue;
        }
        prepared.push(processed);
      }
      if (failed.length > 0) {
        const err = new Error('Unele imagini sunt prea mari pentru upload. Incearca imagini mai mici.');
        (err as any).failed = failed;
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

      for (const file of prepared) {
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
