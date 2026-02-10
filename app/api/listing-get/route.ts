import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { isListingTokenValid } from '@/lib/listingTokens';

const LISTING_SELECT_BASE =
  'id, title, slug, judet, city, sat, price, capacity, camere, paturi, bai, description, phone, type, lat, lng, is_published';
const LISTING_SELECT_WITH_NEWSLETTER = `${LISTING_SELECT_BASE}, newsletter_opt_in`;
const LISTING_SELECT_WITH_CONSENTS = `${LISTING_SELECT_WITH_NEWSLETTER}, terms_accepted, terms_accepted_at`;
const IMAGES_SELECT = 'id, image_url, display_order, alt';

type ListingGetRow = {
  id: string;
  title?: string | null;
  slug?: string | null;
  judet?: string | null;
  city?: string | null;
  sat?: string | null;
  price?: string | number | null;
  capacity?: string | null;
  camere?: number | null;
  paturi?: number | null;
  bai?: number | null;
  description?: string | null;
  phone?: string | null;
  type?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_published?: boolean | null;
  newsletter_opt_in?: boolean | null;
  terms_accepted?: boolean | null;
  terms_accepted_at?: string | null;
};

function asListingGetRow(value: unknown): ListingGetRow | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<ListingGetRow>;
  if (typeof row.id !== 'string' || !row.id) return null;
  return row as ListingGetRow;
}

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, { windowMs: 60_000, max: 120, keyPrefix: 'listing-get' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const body = await request.json().catch(() => ({}));
    const id = body?.id ? String(body.id) : '';
    const slug = body?.slug ? String(body.slug).trim() : '';
    const requirePublished = body?.requirePublished === true;
    if (!id && !slug) return NextResponse.json({ error: 'Missing id or slug' }, { status: 400 });

    const role = getDraftRoleFromRequest(request);
    const hasRole = role === 'admin' || role === 'staff';

    if (!hasRole) {
      // Public clients can only read by id using a valid listing token.
      if (!id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const listingToken = request.headers.get('x-listing-token');
      const tokenValid = await isListingTokenValid(id, listingToken, supabaseAdmin);
      if (!tokenValid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const runListingQuery = async (selectFields: string) => {
      const query = supabaseAdmin.from('listings').select(selectFields);
      if (id) {
        query.eq('id', id);
      } else if (slug) {
        query.eq('slug', slug);
        if (!hasRole || requirePublished) {
          query.eq('is_published', true);
        }
      }
      return query.maybeSingle();
    };

    let { data, error } = await runListingQuery(LISTING_SELECT_WITH_CONSENTS);
    if (error && /terms_accepted|terms_accepted_at/i.test(error.message || '')) {
      ({ data, error } = await runListingQuery(LISTING_SELECT_WITH_NEWSLETTER));
    }
    if (error && /newsletter_opt_in/i.test(error.message || '')) {
      ({ data, error } = await runListingQuery(LISTING_SELECT_BASE));
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const listing = asListingGetRow(data);
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    // also fetch related images and facilities
    const listingId = listing.id;
    const { data: images } = await supabaseAdmin
      .from('listing_images')
      .select(IMAGES_SELECT)
      .eq('listing_id', listingId)
      .order('display_order', { ascending: true });
    const { data: facilityRows } = await supabaseAdmin
      .from('listing_facilities')
      .select('facility_id, facilities(id, name)')
      .eq('listing_id', listingId);

    const facilitiesMap = new Map<string, { id: string; name: string }>();
    const missingIds: string[] = [];
    (facilityRows || []).forEach((row: any) => {
      const fid = row?.facilities?.id || row?.facility_id;
      const name = row?.facilities?.name;
      if (!fid) return;
      if (name) {
        facilitiesMap.set(String(fid), { id: String(fid), name: String(name) });
      } else {
        missingIds.push(String(fid));
      }
    });

    if (missingIds.length > 0) {
      const { data: fallbackFacilities } = await supabaseAdmin
        .from('facilities')
        .select('id, name')
        .in('id', Array.from(new Set(missingIds)));
      (fallbackFacilities || []).forEach((f: any) => {
        if (f?.id && f?.name) {
          facilitiesMap.set(String(f.id), { id: String(f.id), name: String(f.name) });
        }
      });
    }

    return NextResponse.json({
      listing,
      images: images || [],
      facilities: (facilityRows || []).map((r: any) => (r.facilities ? r.facilities.id : r.facility_id)),
      facilitiesDetailed: Array.from(facilitiesMap.values()),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Unknown' }, { status: 500 });
  }
}
