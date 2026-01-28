'use client';

import { useCallback, useEffect, useState } from 'react';

type UseImageSelectionOptions = {
  maxFiles: number;
  onLimit?: (message: string) => void;
};

export default function useImageSelection({ maxFiles, onLimit }: UseImageSelectionOptions) {
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setFilePreviews(next);
    return () => {
      next.forEach((url) => URL.revokeObjectURL(url));
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
