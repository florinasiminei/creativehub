import type { SupabaseClient } from '@supabase/supabase-js';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { isListingTokenValid } from '@/lib/listingTokens';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

export class OwnerAuthUnavailableError extends Error {
  constructor() {
    super('Serviciul de autentificare este temporar indisponibil. Încearcă din nou.');
    this.name = 'OwnerAuthUnavailableError';
  }
}

export type ListingAccess =
  | { authorized: true; kind: 'staff'; ownerId: null }
  | { authorized: true; kind: 'owner'; ownerId: string }
  | { authorized: true; kind: 'legacy-token'; ownerId: null }
  | { authorized: false; kind: 'none'; ownerId: null };

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function getVerifiedOwner(
  request: Request,
  supabaseAdmin: SupabaseClient = getSupabaseAdmin()
) {
  const accessToken = getBearerToken(request);
  if (!accessToken) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (error && (!error.status || error.status === 429 || error.status >= 500)) {
    throw new OwnerAuthUnavailableError();
  }

  if (
    error ||
    !user?.id ||
    !user.email ||
    !user.email_confirmed_at ||
    user.is_anonymous
  ) {
    return null;
  }
  return user;
}

export async function invalidateSubmittedOwnerListing(
  supabaseAdmin: SupabaseAdmin,
  listingId: string,
  ownerId: string
) {
  const { error } = await supabaseAdmin
    .from('listings')
    .update({
      is_published: false,
      publication_status: 'draft',
      submitted_at: null,
    })
    .eq('id', listingId)
    .eq('owner_id', ownerId)
    .eq('publication_status', 'submitted');

  if (error) throw error;
}

export async function resolveListingAccess(
  request: Request,
  listingId: string,
  supabaseAdmin: SupabaseAdmin = getSupabaseAdmin()
): Promise<ListingAccess> {
  if (request.headers.get('x-owner-access') === '1') {
    const owner = await getVerifiedOwner(request, supabaseAdmin);
    if (!owner) {
      return { authorized: false, kind: 'none', ownerId: null };
    }

    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .eq('owner_id', owner.id)
      .maybeSingle();

    return !error && data
      ? { authorized: true, kind: 'owner', ownerId: owner.id }
      : { authorized: false, kind: 'none', ownerId: null };
  }

  const role = await getDraftRoleFromRequest(request);
  if (role === 'admin' || role === 'staff') {
    return { authorized: true, kind: 'staff', ownerId: null };
  }

  const owner = await getVerifiedOwner(request, supabaseAdmin);
  if (owner) {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .eq('owner_id', owner.id)
      .maybeSingle();

    if (!error && data) {
      return { authorized: true, kind: 'owner', ownerId: owner.id };
    }
  }

  const listingToken = request.headers.get('x-listing-token');
  const legacyTokenValid = await isListingTokenValid(listingId, listingToken, supabaseAdmin);
  if (legacyTokenValid) {
    return { authorized: true, kind: 'legacy-token', ownerId: null };
  }

  return { authorized: false, kind: 'none', ownerId: null };
}
