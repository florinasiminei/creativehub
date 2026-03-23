'use client';

import { useCallback, useEffect, useState } from 'react';
import { isConstrainedClientDevice } from '@/lib/deviceProfile';

type UseImageSelectionOptions = {
  maxFiles: number;
  onLimit?: (message: string) => void;
};

export default function useImageSelection({ maxFiles, onLimit }: UseImageSelectionOptions) {
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);

  async function createPreviewUrl(file: File) {
    const fallbackUrl = URL.createObjectURL(file);
    const isImage = file.type.startsWith('image/');
    if (!isImage || typeof window === 'undefined') return fallbackUrl;

    try {
      const constrained = isConstrainedClientDevice();
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new window.Image();
        element.decoding = 'async';
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('preview_load_failed'));
        element.src = fallbackUrl;
      });

      const maxDimension = constrained ? 640 : window.innerWidth < 900 ? 960 : 1280;
      const longestSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
      const scale = longestSide > 0 ? Math.min(1, maxDimension / longestSide) : 1;
      const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
      const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return fallbackUrl;

      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', constrained ? 0.62 : 0.72)
      );
      canvas.width = 0;
      canvas.height = 0;
      if (!blob) return fallbackUrl;

      URL.revokeObjectURL(fallbackUrl);
      return URL.createObjectURL(blob);
    } catch {
      return fallbackUrl;
    }
  }

  useEffect(() => {
    let disposed = false;
    let currentUrls: string[] = [];

    const scheduleIdleTask = (callback: () => void) => {
      if (typeof window === 'undefined') {
        setTimeout(callback, 0);
        return;
      }

      const idleWindow = window as Window & {
        requestIdleCallback?: (cb: () => void) => number;
      };

      if (typeof idleWindow.requestIdleCallback === 'function') {
        idleWindow.requestIdleCallback(callback);
        return;
      }

      window.setTimeout(callback, 32);
    };

    async function buildPreviews() {
      if (files.length === 0) {
        setFilePreviews([]);
        return;
      }

      const constrained = isConstrainedClientDevice();
      const immediateCount = constrained ? Math.min(files.length, 3) : files.length;
      setFilePreviews(new Array(files.length).fill(''));

      const buildPreviewAtIndex = async (index: number) => {
        const file = files[index];
        if (!file) return;
        const previewUrl = await createPreviewUrl(file);
        if (disposed) {
          URL.revokeObjectURL(previewUrl);
          return;
        }
        currentUrls.push(previewUrl);
        setFilePreviews((prev) => {
          const next = prev.length === files.length ? [...prev] : new Array(files.length).fill('');
          next[index] = previewUrl;
          return next;
        });
        if (typeof window !== 'undefined') {
          await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        }
      };

      for (let index = 0; index < immediateCount; index += 1) {
        await buildPreviewAtIndex(index);
      }

      if (immediateCount >= files.length) return;

      const processRemaining = (index: number) => {
        if (disposed || index >= files.length) return;
        scheduleIdleTask(async () => {
          if (disposed) return;
          await buildPreviewAtIndex(index);
          processRemaining(index + 1);
        });
      };

      processRemaining(immediateCount);
    }

    void buildPreviews();
    return () => {
      disposed = true;
      currentUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const appendFiles = useCallback(
    (incoming: File[]) => {
      if (!incoming.length) return;
      setFiles((prev) => {
        const next = [...prev, ...incoming];
        if (next.length > maxFiles) {
          onLimit?.(`Poti incarca maximum ${maxFiles} imagini.`);
          return next.slice(0, maxFiles);
        }
        return next;
      });
    },
    [maxFiles, onLimit],
  );

  const moveFile = useCallback((from: number, to: number) => {
    setFiles((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDragStart = useCallback((idx: number) => setDraggingIdx(idx), []);
  const handleDragOver = useCallback(
    (idx: number) => {
      if (draggingIdx === null || draggingIdx === idx) return;
      moveFile(draggingIdx, idx);
      setDraggingIdx(idx);
    },
    [draggingIdx, moveFile],
  );
  const handleDragEnd = useCallback(() => setDraggingIdx(null), []);

  const resetFiles = useCallback(() => setFiles([]), []);

  return {
    files,
    filePreviews,
    draggingIdx,
    isDropActive,
    setIsDropActive,
    appendFiles,
    moveFile,
    removeFile,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    resetFiles,
    setFiles,
  };
}
