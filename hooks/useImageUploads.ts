import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { completeListingUpload, requestListingUploadUrls } from '@/lib/api/listings';

type UseImageUploadsOptions = {
  onError?: (message: string) => void;
  listingToken?: string | null;
};

export default function useImageUploads({ onError, listingToken }: UseImageUploadsOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const compressImage = async (file: File, targetBytes: number) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const looksLikeImage = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic'].includes(ext);
    if (
      (!file.type.startsWith('image/') && !looksLikeImage) ||
      file.type === 'image/svg+xml'
    ) return file;
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

  const upload = async (listingId: string, files: File[], startIndex = 0, tokenOverride?: string | null) => {
    if (files.length === 0) return { uploaded: [] as any[] };
    setUploading(true);
    setUploadedCount(0);
    try {
      const activeToken = tokenOverride ?? listingToken ?? null;
      const HARD_MAX_BYTES = 50 * 1024 * 1024;
      const TARGET_FILE_BYTES = 8 * 1024 * 1024;
      const hardMaxMb = Math.round(HARD_MAX_BYTES / 1024 / 1024);

      const failed: Array<{ name: string; reason: string }> = [];
      const prepared: Array<{ index: number; file: File; originalName: string }> = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (typeof f.size === 'number' && f.size > HARD_MAX_BYTES) {
          failed.push({ name: f.name, reason: 'file_too_large' });
          continue;
        }
        const processed = await compressImage(f, TARGET_FILE_BYTES);
        if (typeof processed.size === 'number' && processed.size > HARD_MAX_BYTES) {
          failed.push({ name: f.name, reason: 'file_too_large' });
          continue;
        }
        prepared.push({ index: i, file: processed, originalName: f.name });
      }

      if (failed.length > 0) {
        const err = new Error(`Unele imagini sunt prea mari pentru upload (maxim ${hardMaxMb}MB).`);
        (err as any).failed = failed;
        throw err;
      }

      const signBody = await requestListingUploadUrls(
        listingId,
        prepared.map((p) => ({
          index: p.index,
          name: p.file.name,
          type: p.file.type,
          size: p.file.size,
        })),
        startIndex,
        activeToken
      );

      const signFailed = Array.isArray(signBody.failed) ? signBody.failed : [];
      if (signFailed.length > 0) {
        const nameByIndex = new Map(prepared.map((p) => [p.index, p.originalName]));
        const mapped = signFailed.map((f) => ({
          name: nameByIndex.get(f.index) || f.name || 'unknown',
          reason: f.reason || 'signed_url_failed',
        }));
        const onlyTooLarge = mapped.every((f) => f.reason === 'file_too_large');
        const err = new Error(
          onlyTooLarge
            ? `Unele imagini sunt prea mari pentru upload (maxim ${hardMaxMb}MB).`
            : 'Nu s-au incarcat toate imaginile.'
        );
        (err as any).failed = mapped;
        throw err;
      }

      const uploads = Array.isArray(signBody.uploads) ? signBody.uploads : [];
      const uploadedAll: any[] = [];
      for (const uploadItem of uploads) {
        const entry = prepared.find((p) => p.index === uploadItem.index);
        if (!entry) {
          failed.push({ name: 'unknown', reason: 'missing_file' });
          continue;
        }

        const { error } = await supabase.storage
          .from('listing-images')
          .uploadToSignedUrl(
            uploadItem.path,
            uploadItem.token,
            entry.file,
            { contentType: entry.file.type || 'application/octet-stream' }
          );
        if (error) {
          failed.push({ name: entry.originalName, reason: error.message || 'upload_failed' });
          continue;
        }

        try {
          const completed = await completeListingUpload(
            listingId,
            uploadItem.path,
            uploadItem.display_order,
            activeToken
          );
          uploadedAll.push(completed);
          setUploadedCount((prev) => prev + 1);
        } catch (err: any) {
          failed.push({ name: entry.originalName, reason: err?.message || 'insert_failed' });
        }
      }

      if (failed.length > 0) {
        const onlyTooLarge = failed.every((f) => f.reason === 'file_too_large');
        const err = new Error(
          onlyTooLarge
            ? `Unele imagini sunt prea mari pentru upload (maxim ${hardMaxMb}MB).`
            : 'Nu s-au incarcat toate imaginile.'
        );
        (err as any).failed = failed;
        throw err;
      }

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
