import 'server-only';

export class BufferRequestError extends Error {}

export type BufferPost = {
  id: string;
  status: string;
  channelId: string;
  text: string | null;
  dueAt: string | null;
  sentAt: string | null;
  externalLink: string | null;
  schedulingType: string;
  allowedActions: string[];
  assets: Array<{ source: string }>;
};

const POST_FIELDS = 'id status channelId text dueAt sentAt externalLink schedulingType allowedActions assets { source }';

async function bufferRequest<T>(query: string, variables: Record<string, unknown>) {
  const apiKey = process.env.BUFFER_API_KEY?.trim();
  if (!apiKey) throw new BufferRequestError('Cheia API Buffer nu este configurată pe server.');
  let response: Response;
  try {
    response = await fetch('https://api.buffer.com', {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new BufferRequestError('Buffer nu a răspuns. Cererea va fi verificată înainte de reluare.');
  }
  const body = await response.json().catch(() => null) as { data?: T; errors?: unknown[] } | null;
  if (!response.ok || body?.errors?.length || !body?.data) {
    throw new BufferRequestError(response.status === 429
      ? 'Limita API Buffer a fost atinsă. Reîncearcă mai târziu.'
      : 'Buffer a refuzat cererea. Verifică permisiunile, contul și formatul postării.');
  }
  return body.data;
}

type PostResult = { post?: BufferPost; message?: string };

function readPostResult(result: PostResult | undefined) {
  if (!result?.post) throw new BufferRequestError('Buffer nu a acceptat postarea. Verifică setările contului și limitele planului.');
  return result.post;
}

export async function getBufferInstagramChannel() {
  const id = process.env.BUFFER_INSTAGRAM_CHANNEL_ID?.trim();
  if (!id) throw new BufferRequestError('Canalul Instagram Buffer nu este configurat.');
  const { channel } = await bufferRequest<{ channel: {
    id: string; service: string; name: string; isDisconnected: boolean; isLocked: boolean; isQueuePaused: boolean;
  } | null }>(`query($input: ChannelInput!) { channel(input: $input) { id service name isDisconnected isLocked isQueuePaused } }`, { input: { id } });
  if (!channel || channel.service !== 'instagram' || channel.name.replace(/^@/, '').toLowerCase() !== 'cabn.ro') {
    throw new BufferRequestError('Canalul configurat trebuie să fie contul Instagram cabn.ro.');
  }
  if (channel.isDisconnected || channel.isLocked || channel.isQueuePaused) {
    throw new BufferRequestError('Contul Instagram este deconectat, blocat sau are coada în pauză în Buffer.');
  }
  return channel;
}

export async function getBufferPost(id: string) {
  const { post } = await bufferRequest<{ post: BufferPost | null }>(
    `query($input: PostInput!) { post(input: $input) { ${POST_FIELDS} } }`, { input: { id } },
  );
  if (post && post.channelId !== process.env.BUFFER_INSTAGRAM_CHANNEL_ID?.trim()) {
    throw new BufferRequestError('Postarea aparține altui canal Buffer. Operația a fost oprită.');
  }
  return post;
}

export async function createBufferInstagramDraft(caption: string, images: string[]) {
  const channel = await getBufferInstagramChannel();
  const { createPost } = await bufferRequest<{ createPost: PostResult }>(
    `mutation($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { ${POST_FIELDS} } } ... on MutationError { message } } }`,
    { input: {
      channelId: channel.id, text: caption, schedulingType: 'automatic', mode: 'addToQueue',
      saveToDraft: true, needsApproval: false,
      assets: images.map((url) => ({ image: { url } })),
      metadata: { instagram: { type: 'post', shouldShareToFeed: true } },
    } },
  );
  return readPostResult(createPost);
}

export async function scheduleBufferInstagramPost(id: string, caption: string, images: string[], dueAt: string) {
  const { editPost } = await bufferRequest<{ editPost: PostResult }>(
    `mutation($input: EditPostInput!) { editPost(input: $input) { ... on PostActionSuccess { post { ${POST_FIELDS} } } ... on MutationError { message } } }`,
    { input: {
      id, text: caption, assets: images.map((url) => ({ image: { url } })),
      schedulingType: 'automatic', mode: 'customScheduled', dueAt, saveToDraft: false,
      metadata: { instagram: { type: 'post', shouldShareToFeed: true } },
    } },
  );
  return readPostResult(editPost);
}

export async function pauseBufferInstagramPost(id: string) {
  const post = await getBufferPost(id);
  if (!post) throw new BufferRequestError('Postarea nu mai poate fi verificată în Buffer. Verifică manual calendarul Buffer.');
  if (post.status === 'sent' || post.status === 'sending') {
    throw new BufferRequestError('Postarea este deja publicată sau în curs de publicare. Verifică profilul Instagram.');
  }
  if (post.status === 'draft') return post;
  const { editPost } = await bufferRequest<{ editPost: PostResult }>(
    `mutation($input: EditPostInput!) { editPost(input: $input) { ... on PostActionSuccess { post { ${POST_FIELDS} } } ... on MutationError { message } } }`,
    { input: { id, saveToDraft: true } },
  );
  const paused = readPostResult(editPost);
  if (paused.status !== 'draft') throw new BufferRequestError('Buffer nu a confirmat oprirea programării. Verifică manual calendarul Buffer.');
  return paused;
}
