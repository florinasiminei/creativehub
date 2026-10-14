import { readApiBody, uploadToSignedUrl } from '@/lib/api/directUploads';
import { fetchOwnerApi, getOwnerSession } from '@/lib/api/ownerSession';

type OwnerListingPayload = Record<string, unknown>;
type OwnerRequestContext = {
  expectedOwnerId: string;
  headers: Record<string, string>;
};
type DirectUploadPrepareResponse = {
  path: string;
  uploadUrl: string;
  uploadHeaders?: Record<string, string>;
  error?: string;
};

async function getOwnerRequestContext(
  expectedOwnerId: string
): Promise<OwnerRequestContext> {
  if (typeof expectedOwnerId !== 'string') {
    throw new Error('Identitatea proprietarului lipseste. Confirma din nou emailul.');
  }
  const normalizedOwnerId = expectedOwnerId.trim();
  if (!normalizedOwnerId) {
    throw new Error('Identitatea proprietarului lipseste. Confirma din nou emailul.');
  }

  const session = await getOwnerSession(normalizedOwnerId);

  return {
    expectedOwnerId: normalizedOwnerId,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'x-owner-access': '1',
    },
  };
}

export async function createOwnerListing(
  payload: OwnerListingPayload,
  facilities: string[],
  expectedOwnerId: string
) {
  const ownerContext = await getOwnerRequestContext(expectedOwnerId);
  const response = await fetchOwnerApi(ownerContext.expectedOwnerId, '/api/listing-create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...ownerContext.headers,
    },
    body: JSON.stringify({
      ...payload,
      facilities,
      expectedOwnerId: ownerContext.expectedOwnerId,
    }),
  });
  const body = await readApiBody(response);
  if (!response.ok) throw new Error(body?.error || 'Eroare la crearea cazarii');
  return body as { ok: true; id: string };
}

export async function updateOwnerListing(
  payload: OwnerListingPayload,
  expectedOwnerId: string
) {
  const ownerContext = await getOwnerRequestContext(expectedOwnerId);
  const response = await fetchOwnerApi(ownerContext.expectedOwnerId, '/api/listing-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...ownerContext.headers,
    },
    body: JSON.stringify({
      ...payload,
      expectedOwnerId: ownerContext.expectedOwnerId,
    }),
  });
  const body = await readApiBody(response);
  if (!response.ok) throw new Error(body?.error || 'Eroare la actualizarea cazarii');
  return body as { ok: true };
}

export async function uploadOwnerListingFile(
  listingId: string,
  file: File,
  displayOrder: number,
  expectedOwnerId: string,
  alt?: string | null
) {
  const prepareContext = await getOwnerRequestContext(expectedOwnerId);
  // Reuse the same-origin endpoint locally, where R2 CORS may exclude localhost.
  if (process.env.NODE_ENV === 'development') {
    const form = new FormData();
    form.set('listingId', listingId);
    form.set('file', file);
    form.set('displayOrder', String(displayOrder));
    if (alt) form.set('alt', alt);

    const response = await fetchOwnerApi(prepareContext.expectedOwnerId, '/api/listing-upload-file', {
      method: 'POST',
      headers: prepareContext.headers,
      body: form,
    });
    const uploaded = await readApiBody(response);
    if (!response.ok) {
      throw new Error(uploaded?.error || 'Nu am putut incarca imaginea');
    }
    return uploaded as { id: string; url: string; display_order: number };
  }

  const contentType = file.type || 'application/octet-stream';
  const prepareResponse = await fetchOwnerApi(prepareContext.expectedOwnerId, '/api/listing-upload-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...prepareContext.headers,
    },
    body: JSON.stringify({
      action: 'prepare',
      fileName: file.name,
      contentType,
      fileSize: file.size,
      listingId,
      displayOrder,
      expectedOwnerId: prepareContext.expectedOwnerId,
      ...(alt ? { alt } : {}),
    }),
  });
  const prepared = (await readApiBody(
    prepareResponse
  )) as DirectUploadPrepareResponse;
  if (!prepareResponse.ok) {
    throw new Error(prepared?.error || 'Nu am putut pregati uploadul imaginii');
  }

  await uploadToSignedUrl(prepared.uploadUrl, prepared.uploadHeaders, file);

  const completeContext = await getOwnerRequestContext(expectedOwnerId);
  const completeResponse = await fetchOwnerApi(completeContext.expectedOwnerId, '/api/listing-upload-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...completeContext.headers,
    },
    body: JSON.stringify({
      action: 'complete',
      path: prepared.path,
      contentType,
      fileSize: file.size,
      listingId,
      displayOrder,
      expectedOwnerId: completeContext.expectedOwnerId,
      ...(alt ? { alt } : {}),
    }),
  });
  const completed = await readApiBody(completeResponse);
  if (!completeResponse.ok) {
    throw new Error(completed?.error || 'Nu am putut finaliza uploadul imaginii');
  }
  return completed as { id: string; url: string; display_order: number };
}

export async function deleteOwnerListingImage(
  imageId: string,
  expectedOwnerId: string
) {
  const ownerContext = await getOwnerRequestContext(expectedOwnerId);
  const response = await fetchOwnerApi(ownerContext.expectedOwnerId, '/api/listing-images/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...ownerContext.headers,
    },
    body: JSON.stringify({
      id: imageId,
      expectedOwnerId: ownerContext.expectedOwnerId,
    }),
  });
  const body = await readApiBody(response);
  if (!response.ok) throw new Error(body?.error || 'Nu am putut sterge imaginea');
  return body as { ok: true };
}

export async function reorderOwnerListingImages(
  listingId: string,
  imageIds: string[],
  expectedOwnerId: string
) {
  const ownerContext = await getOwnerRequestContext(expectedOwnerId);
  const response = await fetchOwnerApi(ownerContext.expectedOwnerId, '/api/listing-images/reorder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...ownerContext.headers,
    },
    body: JSON.stringify({
      listingId,
      ids: imageIds,
      expectedOwnerId: ownerContext.expectedOwnerId,
    }),
  });
  const body = await readApiBody(response);
  if (!response.ok) {
    throw new Error(body?.error || 'Nu am putut salva ordinea imaginilor');
  }
  return body as { ok: true };
}

export async function submitOwnerListing(
  listingId: string,
  expectedOwnerId: string,
  honeypot = ''
) {
  const ownerContext = await getOwnerRequestContext(expectedOwnerId);
  const response = await fetchOwnerApi(ownerContext.expectedOwnerId, '/api/listing-submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...ownerContext.headers,
    },
    body: JSON.stringify({
      id: listingId,
      expectedOwnerId: ownerContext.expectedOwnerId,
      honeypot,
    }),
  });
  const body = await readApiBody(response);
  if (!response.ok) {
    throw new Error(body?.error || 'Nu am putut trimite cazarea spre verificare');
  }
  return body as { ok: true; status: 'submitted' };
}
