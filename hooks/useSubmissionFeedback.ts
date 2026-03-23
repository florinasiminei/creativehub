'use client';

import { useCallback, useMemo, useState } from 'react';

export type SubmissionFeedbackTone = 'error' | 'success' | 'info';

export type SubmissionFailedUpload = {
  name: string;
  reason: string;
};

export default function useSubmissionFeedback(initialTone: SubmissionFeedbackTone = 'info') {
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<SubmissionFeedbackTone>(initialTone);
  const [failedUploads, setFailedUploads] = useState<SubmissionFailedUpload[]>([]);

  const failedUploadNames = useMemo(() => failedUploads.map((file) => file.name), [failedUploads]);

  const clearFeedback = useCallback(() => {
    setMessage(null);
    setFailedUploads([]);
  }, []);

  const setFeedback = useCallback((
    nextMessage: string | null,
    nextTone: SubmissionFeedbackTone = 'error',
    nextFailedUploads: SubmissionFailedUpload[] = []
  ) => {
    setTone(nextTone);
    setMessage(nextMessage);
    setFailedUploads(nextFailedUploads);
  }, []);

  const setError = useCallback((nextMessage: string | null, nextFailedUploads: SubmissionFailedUpload[] = []) => {
    setFeedback(nextMessage, 'error', nextFailedUploads);
  }, [setFeedback]);

  const setSuccess = useCallback((nextMessage: string | null) => {
    setFeedback(nextMessage, 'success', []);
  }, [setFeedback]);

  const setInfo = useCallback((nextMessage: string | null) => {
    setFeedback(nextMessage, 'info', []);
  }, [setFeedback]);

  const setErrorFromUnknown = useCallback((error: unknown, fallbackMessage = 'A aparut o eroare.') => {
    const nextMessage = error instanceof Error ? error.message : fallbackMessage;
    setError(nextMessage || fallbackMessage);
  }, [setError]);

  const setUploadError = useCallback((
    error: any,
    fallbackMessage = 'Eroare la incarcarea imaginilor'
  ) => {
    const parsedFailed = Array.isArray(error?.failed) ? (error.failed as SubmissionFailedUpload[]) : [];
    const nextMessage =
      error?.message ||
      (parsedFailed.length > 0 ? 'Nu s-au incarcat toate imaginile.' : fallbackMessage);

    setError(nextMessage, parsedFailed);
    return parsedFailed;
  }, [setError]);

  return {
    message,
    tone,
    failedUploads,
    failedUploadNames,
    clearFeedback,
    setFeedback,
    setError,
    setSuccess,
    setInfo,
    setErrorFromUnknown,
    setUploadError,
  };
}
