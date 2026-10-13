import { supabase } from '@/lib/supabaseClient';

export async function getOwnerSession(expectedOwnerId: string) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw new Error('Nu am putut verifica sesiunea. Încearcă din nou.');
  if (!session?.access_token) {
    throw new Error('Sesiunea a expirat. Confirmă din nou emailul proprietarului.');
  }
  if (!expectedOwnerId || session.user.id !== expectedOwnerId) {
    throw new Error('Contul activ s-a schimbat. Reia operația din contul proprietarului.');
  }
  return session;
}

export async function fetchOwnerApi(
  expectedOwnerId: string,
  url: string,
  init: RequestInit = {}
) {
  const send = async (accessToken: string) => {
    init.signal?.throwIfAborted();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('x-owner-access', '1');
    const response = await fetch(url, { ...init, headers, cache: 'no-store' });
    init.signal?.throwIfAborted();
    await getOwnerSession(expectedOwnerId);
    return response;
  };

  init.signal?.throwIfAborted();
  const initialSession = await getOwnerSession(expectedOwnerId);
  let response = await send(initialSession.access_token);
  if (response.status !== 401) return response;

  const currentSession = await getOwnerSession(expectedOwnerId);
  if (currentSession.access_token === initialSession.access_token) {
    init.signal?.throwIfAborted();
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error('Nu am putut reînnoi sesiunea. Încearcă din nou sau confirmă din nou emailul.');
    }
  }

  const renewedSession = await getOwnerSession(expectedOwnerId);
  response = await send(renewedSession.access_token);
  return response;
}
