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

type DrawableImageSource = {
  width: number;
  height: number;
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  dispose: () => void;
};

const COMPRESSIBLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic']);
const HARD_MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_TARGET_FILE_BYTES = 6 * 1024 * 1024;
const CONSTRAINED_TARGET_FILE_BYTES = Math.round(4.5 * 1024 * 1024);
const DEFAULT_MAX_DIMENSION = 2560;
const CONSTRAINED_MAX_DIMENSION = 1800;
const DEFAULT_MAX_PIXELS = 7_000_000;
const CONSTRAINED_MAX_PIXELS = 3_200_000;
const DEFAULT_UPLOAD_CONCURRENCY = 6;
const CONSTRAINED_UPLOAD_CONCURRENCY = 3;

function isCompressibleImage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const looksLikeImage = COMPRESSIBLE_EXTENSIONS.has(extension);
  return (file.type.startsWith('image/') || looksLikeImage) && file.type !== 'image/svg+xml';
}

function isConstrainedDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const isMobileUa = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const touchDevice = navigator.maxTouchPoints > 0;
  const narrowViewport = window.innerWidth > 0 && window.innerWidth < 900;
  const deviceMemory = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0);

  return isMobileUa || (touchDevice && narrowViewport) || (deviceMemory > 0 && deviceMemory <= 4);
}

function getTargetFileBytes() {
  return isConstrainedDevice() ? CONSTRAINED_TARGET_FILE_BYTES : DEFAULT_TARGET_FILE_BYTES;
}

function getUploadConcurrency() {
  return isConstrainedDevice() ? CONSTRAINED_UPLOAD_CONCURRENCY : DEFAULT_UPLOAD_CONCURRENCY;
}

function getSizeConstraints() {
  if (isConstrainedDevice()) {
    return {
      maxDimension: CONSTRAINED_MAX_DIMENSION,
      maxPixels: CONSTRAINED_MAX_PIXELS,
      qualities: [0.74, 0.66, 0.58, 0.5, 0.42],
      dimensions: [1600, 1440, 1280, 1080, 960],
    };
  }

  return {
    maxDimension: DEFAULT_MAX_DIMENSION,
    maxPixels: DEFAULT_MAX_PIXELS,
    qualities: [0.8, 0.72, 0.64, 0.56, 0.48],
    dimensions: [2200, 1920, 1680, 1440, 1280],
  };
}

async function yieldToBrowser() {
  await new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });
}

function computeScaledSize(width: number, height: number, maxDimension: number, maxPixels: number) {
  const longestSide = Math.max(width, height);
  const dimensionScale = longestSide > 0 ? Math.min(1, maxDimension / longestSide) : 1;
  const pixelScale = width > 0 && height > 0 ? Math.min(1, Math.sqrt(maxPixels / (width * height))) : 1;
  const scale = Math.min(dimensionScale, pixelScale);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function loadImageElement(file: File): Promise<DrawableImageSource> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('image_load_failed'));
      element.decoding = 'async';
      element.src = objectUrl;
    });

    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

async function loadDrawableImageSource(file: File): Promise<DrawableImageSource> {
  if (typeof createImageBitmap === 'function' && !isConstrainedDevice()) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
        dispose: () => bitmap.close(),
      };
    } catch {
      // Fall back to an HTMLImageElement on browsers where ImageBitmap decoding is unstable.
    }
  }

  return loadImageElement(file);
}

function makeCompressedFile(file: File, blob: Blob) {
  const nextName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${nextName}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}

function isRequestTooLargeMessage(message: string) {
  return /request entity too large|function_payload_too_large/i.test(message);
}

export async function compressImageForUpload(file: File, targetBytes = getTargetFileBytes()) {
  if (!isCompressibleImage(file)) return file;
  if (typeof window === 'undefined') return file;
  if (file.size <= targetBytes) return file;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return file;

  let source: DrawableImageSource | null = null;
  let smallestBlob: Blob | null = null;

  try {
    source = await loadDrawableImageSource(file);
    const constraints = getSizeConstraints();
    const initialSize = computeScaledSize(
      source.width,
      source.height,
      constraints.maxDimension,
      constraints.maxPixels
    );
    const dimensions = Array.from(
      new Set([Math.max(initialSize.width, initialSize.height), ...constraints.dimensions])
    );

    for (const maxDimension of dimensions) {
      const nextSize = computeScaledSize(source.width, source.height, maxDimension, constraints.maxPixels);
      canvas.width = nextSize.width;
      canvas.height = nextSize.height;
      context.clearRect(0, 0, nextSize.width, nextSize.height);
      source.draw(context, nextSize.width, nextSize.height);

      for (const quality of constraints.qualities) {
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
        if (!blob) continue;

        if (!smallestBlob || blob.size < smallestBlob.size) {
          smallestBlob = blob;
        }

        if (blob.size <= targetBytes) {
          return makeCompressedFile(file, blob);
        }
      }

      await yieldToBrowser();
    }

    if (smallestBlob && smallestBlob.size < file.size) {
      return makeCompressedFile(file, smallestBlob);
    }

    return file;
  } catch {
    return file;
  } finally {
    source?.dispose();
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function uploadImageBatch<T>({
  files,
  startIndex = 0,
  uploadFile,
  onUploaded,
}: UploadImageBatchOptions<T>) {
  if (files.length === 0) return { uploaded: [] as T[] };

  const failed: UploadFailure[] = [];
  const uploadedByIndex = new Map<number, T>();
  const failedIndices: number[] = [];
  const uploadedIndices: number[] = [];
  const concurrency = Math.max(1, Math.min(getUploadConcurrency(), files.length));
  let nextIndex = 0;

  const processSingleFile = async (index: number) => {
    const entry = files[index];
    if (!entry) return;

    if (typeof entry.size === 'number' && entry.size > HARD_MAX_BYTES) {
      failed.push({ name: entry.name, reason: 'file_too_large' });
      failedIndices.push(index);
      await yieldToBrowser();
      return;
    }

    const processed = await compressImageForUpload(entry);

    try {
      const uploaded = await uploadFile(processed, startIndex + index);
      uploadedByIndex.set(index, uploaded);
      uploadedIndices.push(index);
      onUploaded?.(uploaded, index);
    } catch (error: any) {
      const message = String(error?.message || '');
      failed.push({
        name: entry.name,
        reason: isRequestTooLargeMessage(message) ? 'payload_too_large' : message || 'insert_failed',
      });
      failedIndices.push(index);
    }

    await yieldToBrowser();
  };

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= files.length) return;
      await processSingleFile(currentIndex);
    }
  });

  await Promise.all(workers);

  const orderedUploadedIndices = [...uploadedIndices].sort((left, right) => left - right);
  const uploadedAll = orderedUploadedIndices
    .map((index) => uploadedByIndex.get(index))
    .filter((item): item is T => item !== undefined);

  if (uploadedAll.length > 0) {
    uploadedIndices.length = 0;
    uploadedIndices.push(...orderedUploadedIndices);
  }

  if (failed.length > 0) {
    const onlyTooLarge = failed.every((item) => item.reason === 'file_too_large' || item.reason === 'payload_too_large');
    const error = new Error(
      onlyTooLarge
        ? `Unele imagini sunt prea mari pentru upload chiar si dupa optimizare. Incearca fisiere mai mici sau mai putine poze facute direct la rezolutie maxima.`
        : 'Nu s-au incarcat toate imaginile.'
    );
    (error as Error & { failed?: UploadFailure[]; uploaded?: T[] }).failed = failed;
    (error as Error & { failed?: UploadFailure[]; uploaded?: T[] }).uploaded = uploadedAll;
    (error as Error & { failedIndices?: number[] }).failedIndices = failedIndices;
    (error as Error & { uploadedIndices?: number[] }).uploadedIndices = uploadedIndices;
    throw error;
  }

  return { uploaded: uploadedAll };
}
