import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

let supabaseAdmin: SupabaseClient | null = null;

async function serverFetch(input: RequestInfo | URL, init?: RequestInit) {
  const startedAt = performance.now();
  let status: number | undefined;
  try {
    const response = await fetch(input, init);
    status = response.status;
    return response;
  } finally {
    const durationMs = Math.round(performance.now() - startedAt);
    if (process.env.NODE_ENV === 'development' && durationMs > 2_000) {
      const url = new URL(input instanceof Request ? input.url : String(input));
      console.warn('[supabase-admin] Slow upstream request', { path: url.pathname, status, durationMs });
    }
  }
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, serviceKey, { global: { fetch: serverFetch } });
  }
  return supabaseAdmin;
}
