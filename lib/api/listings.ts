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
  return body as { id: string };
}

export async function updateListing(payload: any) {
  const resp = await fetch('/api/listing-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  inviteToken?: string | null
) {
  const fd = new FormData();
  fd.append('listingId', listingId);
  if (startIndex > 0) fd.append('startIndex', String(startIndex));
  files.forEach((f) => fd.append('files', f));

  const resp = await fetch('/api/listing-upload', {
    method: 'POST',
    headers: inviteToken ? { 'x-invite-token': inviteToken } : undefined,
    body: fd,
  });
  const body = await resp.json();
  if (!resp.ok) throw new Error(body?.error || 'Eroare la incarcarea imaginilor');
  return body as { uploaded?: Array<{ id: string; url: string; display_order: number }> };
}

export async function deleteListingImage(id: string) {
  const resp = await fetch('/api/listing-images/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!resp.ok) throw new Error('Nu am putut sterge imaginea');
}

export async function reorderListingImages(listingId: string, ids: string[]) {
  const resp = await fetch('/api/listing-images/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId, ids }),
  });
  if (!resp.ok) throw new Error('Nu am putut salva ordinea imaginilor');
}
