export async function createListing(payload: any, facilities: string[], inviteToken?: string | null) {
  const resp = await fetch('/api/listing-create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify({ ...payload, facilities }),
  });
  const body = await resp.json();
  if (!resp.ok) throw new Error(body?.error || 'Eroare la creare anunt');
  return body as { id: string; editToken?: string | null };
}

export async function updateListing(payload: any, listingToken?: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (listingToken) headers['x-listing-token'] = listingToken;
  const resp = await fetch('/api/listing-update', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const body = await resp.json();
  if (!resp.ok) throw new Error(body?.error || 'Eroare la actualizare');
  return body;
}

export async function uploadListingImages(
  listingId: string,
  files: File[],
  startIndex = 0,
  listingToken?: string | null
) {
  const fd = new FormData();
  fd.append('listingId', listingId);
  if (startIndex > 0) fd.append('startIndex', String(startIndex));
  files.forEach((f) => fd.append('files', f));

  const resp = await fetch('/api/listing-upload', {
    method: 'POST',
    headers: listingToken ? { 'x-listing-token': listingToken } : undefined,
    body: fd,
  });
  const contentType = resp.headers.get('content-type') || '';
  let body: any = null;
  if (contentType.includes('application/json')) {
    try {
      body = await resp.json();
    } catch {
      body = null;
    }
  } else {
    try {
      body = await resp.text();
    } catch {
      body = null;
    }
  }
  if (!resp.ok) {
    const failedCount = Array.isArray(body?.failed) ? body.failed.length : 0;
    const serverMsg =
      typeof body === 'string'
        ? body
        : body?.error || body?.message || null;
    const msg =
      failedCount > 0
        ? `Nu s-au incarcat toate imaginile (${failedCount} esuate).`
        : resp.status === 413
          ? serverMsg || 'Fisierul este prea mare. Incearca imagini mai mici sau mai putine simultan.'
          : serverMsg || 'Eroare la incarcarea imaginilor';
    const err = new Error(msg) as Error & { failed?: Array<{ name: string; reason: string }> };
    if (Array.isArray(body?.failed)) err.failed = body.failed;
    throw err;
  }
  return body as {
    uploaded?: Array<{ id: string; url: string; display_order: number }>;
    failed?: Array<{ name: string; reason: string }>;
  };
}

export async function requestListingUploadUrls(
  listingId: string,
  files: Array<{ index: number; name: string; type?: string; size?: number }>,
  startIndex = 0,
  listingToken?: string | null
) {
  const resp = await fetch('/api/listing-upload-sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(listingToken ? { 'x-listing-token': listingToken } : {}),
    },
    body: JSON.stringify({ listingId, files, startIndex }),
  });
  const body = await resp.json();
  if (!resp.ok) throw new Error(body?.error || 'Eroare la semnarea upload-ului');
  return body as {
    uploads?: Array<{ index: number; path: string; token: string; display_order: number }>;
    failed?: Array<{ index: number; name: string; reason: string }>;
  };
}

export async function completeListingUpload(
  listingId: string,
  path: string,
  displayOrder: number,
  listingToken?: string | null,
  alt?: string | null
) {
  const resp = await fetch('/api/listing-upload-complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(listingToken ? { 'x-listing-token': listingToken } : {}),
    },
    body: JSON.stringify({ listingId, path, displayOrder, alt }),
  });
  const body = await resp.json();
  if (!resp.ok) throw new Error(body?.error || 'Eroare la finalizarea upload-ului');
  return body as { id: string; url: string; display_order: number };
}

export async function deleteListing(id: string, inviteToken?: string | null) {
  const resp = await fetch('/api/listing-delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify({ id }),
  });
  if (!resp.ok) throw new Error('Nu am putut sterge listarea');
}

export async function deleteListingImage(id: string, listingToken?: string | null) {
  const resp = await fetch('/api/listing-images/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(listingToken ? { 'x-listing-token': listingToken } : {}),
    },
    body: JSON.stringify({ id }),
  });
  if (!resp.ok) throw new Error('Nu am putut sterge imaginea');
}

export async function reorderListingImages(listingId: string, ids: string[], listingToken?: string | null) {
  const resp = await fetch('/api/listing-images/reorder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(listingToken ? { 'x-listing-token': listingToken } : {}),
    },
    body: JSON.stringify({ listingId, ids }),
  });
  if (!resp.ok) throw new Error('Nu am putut salva ordinea imaginilor');
}
