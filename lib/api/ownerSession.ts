import { supabase } from '@/lib/supabaseClient';
import { invalidateOwnerOverview, syncOwnerOverviewCache } from '@/lib/api/ownerOverviewCache';

// Keep clearing cached account data even while the dashboard is unmounted.
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    syncOwnerOverviewCache(event === 'SIGNED_OUT' ? null : session?.user.id || null);
  });
}

export async function getOwnerSession(expectedOwnerId: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Nu am putut verifica sesiunea. Încearcă din nou.')), 20_000);
  });
  const result = await Promise.race([supabase.auth.getSession(), timeout])
    .finally(() => clearTimeout(timeoutId));
  const { data: { session }, error } = result;
  if (error) throw new Error('Nu am putut verifica sesiunea. Încearcă din nou.');
  syncOwnerOverviewCache(session?.user.id || null);
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
    const method = (init.method || 'GET').toUpperCase();
    if (response.ok && !['GET', 'HEAD', 'OPTIONS'].includes(method) && url !== '/api/listing-get') {
      invalidateOwnerOverview(expectedOwnerId);
    }
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
