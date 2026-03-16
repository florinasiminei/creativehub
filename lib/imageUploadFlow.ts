export type UploadFailure = {
  name: string;
  reason: string;
};

type UploadImageBatchOptions<T> = {
  files: File[];
  startIndex?: number;
  uploadFile: (file: File, displayOrder: number) => Promise<T>;
  onUploaded?: (uploaded: T, index: number) => void;
};

const COMPRESSIBLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic']);
const HARD_MAX_BYTES = 50 * 1024 * 1024;
const TARGET_FILE_BYTES = 8 * 1024 * 1024;

export async function compressImageForUpload(file: File, targetBytes = TARGET_FILE_BYTES) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const looksLikeImage = COMPRESSIBLE_EXTENSIONS.has(extension);

  if ((!file.type.startsWith('image/') && !looksLikeImage) || file.type === 'image/svg+xml') return file;
  if (typeof window === 'undefined') return file;

  const isModernFormat =
    file.type === 'image/webp' ||
    file.type === 'image/avif' ||
    extension === 'webp' ||
    extension === 'avif';
  if (isModernFormat || file.size <= targetBytes) return file;

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

  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);

  const qualities = [0.82, 0.74, 0.66, 0.58];
  for (const quality of qualities) {
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) continue;
    if (blob.size <= targetBytes) {
      return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
    }
  }

  return file;
}

export async function uploadImageBatch<T>({
  files,
  startIndex = 0,
  uploadFile,
  onUploaded,
}: UploadImageBatchOptions<T>) {
  if (files.length === 0) return { uploaded: [] as T[] };

  const hardMaxMb = Math.round(HARD_MAX_BYTES / 1024 / 1024);
  const failed: UploadFailure[] = [];
  const prepared: Array<{ file: File; originalName: string }> = [];

  for (const file of files) {
    if (typeof file.size === 'number' && file.size > HARD_MAX_BYTES) {
      failed.push({ name: file.name, reason: 'file_too_large' });
      continue;
    }

    const processed = await compressImageForUpload(file, TARGET_FILE_BYTES);
    if (typeof processed.size === 'number' && processed.size > HARD_MAX_BYTES) {
      failed.push({ name: file.name, reason: 'file_too_large' });
      continue;
    }

    prepared.push({ file: processed, originalName: file.name });
  }

  if (failed.length > 0) {
    const error = new Error(`Unele imagini sunt prea mari pentru upload (maxim ${hardMaxMb}MB).`);
    (error as Error & { failed?: UploadFailure[] }).failed = failed;
    throw error;
  }

  const uploadedAll: T[] = [];
  for (let index = 0; index < prepared.length; index += 1) {
    const entry = prepared[index];
    try {
      const uploaded = await uploadFile(entry.file, startIndex + index);
      uploadedAll.push(uploaded);
      onUploaded?.(uploaded, index);
    } catch (error: any) {
      failed.push({ name: entry.originalName, reason: error?.message || 'insert_failed' });
    }
  }

  if (failed.length > 0) {
    const onlyTooLarge = failed.every((item) => item.reason === 'file_too_large');
    const error = new Error(
      onlyTooLarge
        ? `Unele imagini sunt prea mari pentru upload (maxim ${hardMaxMb}MB).`
        : 'Nu s-au incarcat toate imaginile.'
    );
    (error as Error & { failed?: UploadFailure[] }).failed = failed;
    throw error;
  }

  return { uploaded: uploadedAll };
}
