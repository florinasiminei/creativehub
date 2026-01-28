export async function createListing(payload: any, facilities: string[]) {
  const resp = await fetch('/api/listing-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, facilities }),
  });
  const body = await resp.json();
  if (!resp.ok) throw new Error(body?.error || 'Eroare la creare anunț');
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

export async function uploadListingImages(listingId: string, files: File[], startIndex = 0) {
  const fd = new FormData();
  fd.append('listingId', listingId);
  if (startIndex > 0) fd.append('startIndex', String(startIndex));
  files.forEach((f) => fd.append('files', f));

  const resp = await fetch('/api/listing-upload', { method: 'POST', body: fd });
  const body = await resp.json();
  if (!resp.ok) throw new Error(body?.error || 'Eroare la încărcarea imaginilor');
  return body as { uploaded?: Array<{ id: string; url: string; display_order: number }> };
}

export async function deleteListingImage(id: string) {
  const resp = await fetch('/api/listing-images/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!resp.ok) throw new Error('Nu am putut șterge imaginea');
}

export async function reorderListingImages(listingId: string, ids: string[]) {
  const resp = await fetch('/api/listing-images/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId, ids }),
  });
  if (!resp.ok) throw new Error('Nu am putut salva ordinea imaginilor');
}
