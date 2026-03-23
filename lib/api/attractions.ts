import type { AttractionImage } from '@/lib/attractions/attractionForm';
import { prepareAndUploadDirectFile, readApiBody } from '@/lib/api/directUploads';

export async function createAttraction(payload: any, inviteToken?: string | null) {
  const resp = await fetch('/api/attraction-create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = await readApiBody(resp);
  if (!resp.ok) throw new Error(body?.error || 'Eroare la creare atractie');
  return body as { id: string };
}

export async function getAttraction(id: string, inviteToken?: string | null) {
  const resp = await fetch('/api/attraction-get', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify({ id }),
  });
  const body = await readApiBody(resp);
  if (!resp.ok) throw new Error(body?.error || 'Eroare la incarcare atractie');
  return body as {
    attraction: any;
    images: AttractionImage[];
  };
}

export async function updateAttraction(payload: any, inviteToken?: string | null) {
  const resp = await fetch('/api/attraction-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = await readApiBody(resp);
  if (!resp.ok) throw new Error(body?.error || 'Eroare la actualizare atractie');
  return body;
}

export async function deleteAttraction(id: string, inviteToken?: string | null) {
  const resp = await fetch('/api/attraction-delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify({ id }),
  });
  if (!resp.ok) throw new Error('Nu am putut sterge atractia');
}

export async function deleteAttractionImage(id: string, inviteToken?: string | null) {
  const resp = await fetch('/api/attraction-images/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify({ id }),
  });
  if (!resp.ok) throw new Error('Nu am putut sterge imaginea');
}

export async function reorderAttractionImages(attractionId: string, ids: string[], inviteToken?: string | null) {
  const resp = await fetch('/api/attraction-images/reorder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify({ attractionId, ids }),
  });
  if (!resp.ok) throw new Error('Nu am putut salva ordinea imaginilor');
}

export async function uploadAttractionFile(
  attractionId: string,
  file: File,
  displayOrder: number,
  inviteToken?: string | null,
  alt?: string | null
) {
  const authHeaders = inviteToken ? { 'x-invite-token': inviteToken } : undefined;

  return prepareAndUploadDirectFile({
    endpoint: '/api/attraction-upload-file',
    preparePayload: {
      attractionId,
      displayOrder,
      ...(alt ? { alt } : {}),
    },
    completePayload: (prepared) => ({
      attractionId,
      displayOrder,
      path: prepared.path,
      ...(alt ? { alt } : {}),
    }),
    authHeaders,
    file,
  }) as Promise<{ id: string; url: string; display_order: number }>;
}
