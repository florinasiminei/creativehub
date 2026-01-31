import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabaseAdmin';

export function generateListingToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export async function ensureListingToken(listingId: string, existingToken?: string | null) {
  if (existingToken && existingToken.trim().length > 0) return existingToken;
  const supabaseAdmin = getSupabaseAdmin();
  const token = generateListingToken();
  const { error } = await supabaseAdmin
    .from('listings')
    .update({ edit_token: token })
    .eq('id', listingId);
  if (error) return null;
  return token;
}

export async function isListingTokenValid(
  listingId: string,
  token: string | null | undefined,
  supabaseAdmin?: SupabaseClient
) {
  if (!listingId || !token) return false;
  const client = supabaseAdmin || getSupabaseAdmin();
  const { data, error } = await client
    .from('listings')
    .select('edit_token')
    .eq('id', listingId)
    .single();
  if (error) return false;
  return data?.edit_token === token;
}
