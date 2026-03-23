type DirectUploadPrepareResponse = {
  path: string;
  url: string;
  uploadUrl: string;
  uploadHeaders?: Record<string, string>;
  contentType?: string;
};

export async function readApiBody(resp: Response) {
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return resp.json();
  }

  const text = await resp.text();
  return { error: text || `HTTP ${resp.status}` };
}

export async function uploadToSignedUrl(uploadUrl: string, headers: Record<string, string> | undefined, file: File) {
  try {
    const resp = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(text || `Upload failed (${resp.status})`);
    }
  } catch (error: any) {
    const message = String(error?.message || '');
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      throw new Error('Uploadul direct catre R2 a esuat. Verifica setarea CORS pentru bucket si incearca din nou.');
    }

    throw error;
  }
}

export async function prepareAndUploadDirectFile<TPreparePayload extends Record<string, unknown>, TCompletePayload extends Record<string, unknown>, TResult>({
  endpoint,
  preparePayload,
  completePayload,
  authHeaders,
  file,
}: {
  endpoint: string;
  preparePayload: TPreparePayload;
  completePayload: (prepared: DirectUploadPrepareResponse) => TCompletePayload;
  authHeaders?: Record<string, string>;
  file: File;
}) {
  const contentType = file.type || 'application/octet-stream';
  const prepareResp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders || {}),
    },
    body: JSON.stringify({
      action: 'prepare',
      fileName: file.name,
      contentType,
      ...preparePayload,
    }),
  });
  const prepared = (await readApiBody(prepareResp)) as DirectUploadPrepareResponse & { error?: string };
  if (!prepareResp.ok) throw new Error(prepared?.error || 'Nu am putut pregati uploadul imaginii');

  await uploadToSignedUrl(prepared.uploadUrl, prepared.uploadHeaders, file);

  const completeResp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders || {}),
    },
    body: JSON.stringify({
      action: 'complete',
      path: prepared.path,
      ...completePayload(prepared),
    }),
  });
  const completed = await readApiBody(completeResp);
  if (!completeResp.ok) throw new Error(completed?.error || 'Nu am putut finaliza uploadul imaginii');
  return completed as TResult;
}
