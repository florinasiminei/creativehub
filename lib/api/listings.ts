import { prepareAndUploadDirectFile, readApiBody } from '@/lib/api/directUploads';
import { supabase } from '@/lib/supabaseClient';

export async function getOwnerAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

export async function updateListing(payload: any, listingToken?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await getOwnerAuthHeaders()),
  };
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

export async function submitListing(
  listingId: string,
  listingToken?: string | null,
  honeypot = ''
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await getOwnerAuthHeaders()),
  };
  if (listingToken) headers['x-listing-token'] = listingToken;

  const resp = await fetch('/api/listing-submit', {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: listingId, honeypot }),
  });
  const body = await readApiBody(resp);
  if (!resp.ok) throw new Error(body?.error || 'Nu am putut trimite cazarea spre verificare');
  return body as { ok: true; status: 'submitted' };
}

export async function uploadListingFile(
  listingId: string,
  file: File,
  displayOrder: number,
  listingToken?: string | null,
  alt?: string | null
) {
  const authHeaders: Record<string, string> = {
    ...(await getOwnerAuthHeaders()),
    ...(listingToken ? { 'x-listing-token': listingToken } : {}),
  };

  return prepareAndUploadDirectFile({
    endpoint: '/api/listing-upload-file',
    preparePayload: {
      listingId,
      displayOrder,
      ...(alt ? { alt } : {}),
    },
    completePayload: (prepared) => ({
      listingId,
      displayOrder,
      path: prepared.path,
      ...(alt ? { alt } : {}),
    }),
    authHeaders,
    file,
  }) as Promise<{ id: string; url: string; display_order: number }>;
}

export async function deleteListingImage(id: string, listingToken?: string | null) {
  const ownerHeaders = await getOwnerAuthHeaders();
  const resp = await fetch('/api/listing-images/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(listingToken ? { 'x-listing-token': listingToken } : {}),
      ...ownerHeaders,
    },
    body: JSON.stringify({ id }),
  });
  if (!resp.ok) throw new Error('Nu am putut sterge imaginea');
}

export async function reorderListingImages(listingId: string, ids: string[], listingToken?: string | null) {
  const ownerHeaders = await getOwnerAuthHeaders();
  const resp = await fetch('/api/listing-images/reorder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(listingToken ? { 'x-listing-token': listingToken } : {}),
      ...ownerHeaders,
    },
    body: JSON.stringify({ listingId, ids }),
  });
  if (!resp.ok) throw new Error('Nu am putut salva ordinea imaginilor');
}
