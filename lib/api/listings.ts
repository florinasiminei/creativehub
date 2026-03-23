async function readApiBody(resp: Response) {
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return resp.json();
  }

  const text = await resp.text();
  return { error: text || `HTTP ${resp.status}` };
}

export async function createListing(payload: any, facilities: string[], inviteToken?: string | null) {
  const resp = await fetch('/api/listing-create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify({ ...payload, facilities }),
  });
  const body = await readApiBody(resp);
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
  const body = await readApiBody(resp);
  if (!resp.ok) throw new Error(body?.error || 'Eroare la actualizare');
  return body;
}

export async function uploadListingFile(
  listingId: string,
  file: File,
  displayOrder: number,
  listingToken?: string | null,
  alt?: string | null
) {
  const form = new FormData();
  form.append('listingId', listingId);
  form.append('displayOrder', String(displayOrder));
  if (alt) form.append('alt', alt);
  form.append('file', file);

  const resp = await fetch('/api/listing-upload-file', {
    method: 'POST',
    headers: listingToken ? { 'x-listing-token': listingToken } : undefined,
    body: form,
  });
  const body = await readApiBody(resp);
  if (!resp.ok) throw new Error(body?.error || 'Eroare la incarcarea imaginii');
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
