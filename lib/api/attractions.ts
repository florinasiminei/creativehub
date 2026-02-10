export async function createAttraction(payload: any, inviteToken?: string | null) {
  const resp = await fetch('/api/attraction-create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = await resp.json();
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
  const body = await resp.json();
  if (!resp.ok) throw new Error(body?.error || 'Eroare la incarcare atractie');
  return body as {
    attraction: any;
    images: Array<{ id: string; image_url: string; display_order?: number | null; alt?: string | null }>;
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
  const body = await resp.json();
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

export async function requestAttractionUploadUrls(
  attractionId: string,
  files: Array<{ index: number; name: string; type?: string; size?: number }>,
  startIndex = 0,
  inviteToken?: string | null
) {
  const resp = await fetch('/api/attraction-upload-sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify({ attractionId, files, startIndex }),
  });
  const body = await resp.json();
  if (!resp.ok) throw new Error(body?.error || 'Eroare la semnarea upload-ului');
  return body as {
    uploads?: Array<{ index: number; path: string; token: string; display_order: number }>;
    failed?: Array<{ index: number; name: string; reason: string }>;
  };
}

export async function completeAttractionUpload(
  attractionId: string,
  path: string,
  displayOrder: number,
  inviteToken?: string | null,
  alt?: string | null
) {
  const resp = await fetch('/api/attraction-upload-complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inviteToken ? { 'x-invite-token': inviteToken } : {}),
    },
    body: JSON.stringify({ attractionId, path, displayOrder, alt }),
  });
  const body = await resp.json();
  if (!resp.ok) throw new Error(body?.error || 'Eroare la finalizarea upload-ului');
  return body as { id: string; url: string; display_order: number };
}
