import { NextResponse } from 'next/server';
import { syncListingGeoZones } from '@/lib/geoZones';
import { rateLimit } from '@/lib/rateLimit';
import { getVerifiedOwner, OwnerAuthUnavailableError } from '@/lib/server/ownerAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { slugify } from '@/lib/utils';

async function ensureUniqueSlug(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  baseSlug: string
) {
  const normalizedBase = slugify(baseSlug) || 'cazare';
  let candidate = normalizedBase;
  let suffix = 2;

  while (true) {
    const { count, error } = await supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('slug', candidate);

    if (error) return candidate;
    if (Number(count || 0) === 0) return candidate;

    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
    if (suffix > 10_000) {
      return `${normalizedBase}-${Date.now().toString(36)}`;
    }
  }
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeCapacity(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s*([-/])\s*/g, '$1')
    .trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  try {
    if (request.headers.get('x-owner-access') !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = rateLimit(request, {
      windowMs: 60 * 60_000,
      max: 3,
      keyPrefix: 'listing-create-owner',
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfter) },
        }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const owner = await getVerifiedOwner(request, supabaseAdmin);
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const expectedOwnerId =
      typeof body.expectedOwnerId === 'string' ? body.expectedOwnerId.trim() : '';
    if (!expectedOwnerId) {
      return NextResponse.json({ error: 'Missing expected owner' }, { status: 400 });
    }
    if (expectedOwnerId !== owner.id) {
      return NextResponse.json(
        { error: 'Contul activ s-a schimbat. Reia confirmarea emailului.' },
        { status: 409 }
      );
    }
    if (String(body.honeypot ?? '').trim()) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
    }

    const {
      title,
      slug,
      city,
      sat,
      price,
      capacity,
      phone,
      type,
      description,
      facilities,
      lat,
      lng,
      latitude,
      longitude,
      camere,
      paturi,
      bai,
    } = body;

    const textLimits: Array<[string, unknown, number]> = [
      ['title', title, 160],
      ['slug', slug, 200],
      ['judet', body.judet, 120],
      ['city', city, 120],
      ['sat', sat, 120],
      ['phone', phone, 32],
      ['type', type, 80],
      ['description', description, 1000],
    ];
    const invalidTextField = textLimits.find(
      ([, value, maxLength]) =>
        value !== null &&
        value !== undefined &&
        (typeof value !== 'string' || value.length > maxLength)
    );
    if (invalidTextField) {
      return NextResponse.json(
        { error: `Camp invalid: ${invalidTextField[0]}` },
        { status: 400 }
      );
    }
    if (
      facilities !== undefined &&
      (!Array.isArray(facilities) ||
        facilities.length > 50 ||
        facilities.some(
          (facilityId: unknown) =>
            typeof facilityId !== 'string' || facilityId.length > 100
        ))
    ) {
      return NextResponse.json({ error: 'Facilitati invalide' }, { status: 400 });
    }

    const titleValue = typeof title === 'string' ? title.trim() : '';
    const judetValue = body.judet ?? null;
    if (!titleValue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!judetValue) {
      return NextResponse.json({ error: 'Judet obligatoriu' }, { status: 400 });
    }

    const normalizedFacilities: string[] = Array.isArray(facilities)
      ? Array.from(new Set(facilities.map((facilityId: string) => facilityId.toLowerCase())))
      : [];
    if (normalizedFacilities.some((facilityId) => !isUuid(facilityId))) {
      return NextResponse.json({ error: 'Facilitati invalide' }, { status: 400 });
    }
    if (normalizedFacilities.length > 0) {
      const { data: validFacilities, error: facilitiesValidationError } = await supabaseAdmin
        .from('facilities')
        .select('id')
        .in('id', normalizedFacilities);
      if (facilitiesValidationError) {
        console.error('Could not validate listing facilities', facilitiesValidationError);
        return NextResponse.json({ error: 'Nu am putut verifica facilitatile. Incearca din nou.' }, { status: 500 });
      }
      if ((validFacilities || []).length !== normalizedFacilities.length) {
        return NextResponse.json({ error: 'Facilitati invalide' }, { status: 400 });
      }
    }

    const parsedLat = toNumber(lat) ?? toNumber(latitude);
    const parsedLng = toNumber(lng) ?? toNumber(longitude);
    const hasNewsletterOptIn = Object.prototype.hasOwnProperty.call(
      body,
      'newsletter_opt_in'
    );
    const hasTermsAccepted = Object.prototype.hasOwnProperty.call(
      body,
      'terms_accepted'
    );
    const preferredSlug = typeof slug === 'string' ? slugify(slug) : '';
    const titleSlug = slugify(titleValue || 'Draft proprietate');
    const uniqueSlug = await ensureUniqueSlug(
      supabaseAdmin,
      preferredSlug || titleSlug || 'cazare'
    );

    const payload: Record<string, unknown> = {
      title: titleValue || 'Draft proprietate',
      slug: uniqueSlug,
      judet: judetValue || null,
      city: city || null,
      sat: sat || null,
      price: price || 0,
      capacity: normalizeCapacity(capacity) || '1',
      camere: toNumber(camere),
      paturi: toNumber(paturi),
      bai: toNumber(bai),
      phone: phone || null,
      type: type || 'cabana',
      description: description || null,
      lat: parsedLat,
      lng: parsedLng,
      display_order: null,
      is_published: false,
      publication_status: 'draft',
      edit_token: null,
      created_by_actor: 'client',
      owner_id: owner.id,
    };
    if (hasNewsletterOptIn) {
      payload.newsletter_opt_in = body.newsletter_opt_in === true;
    }
    if (hasTermsAccepted) {
      const termsAccepted = body.terms_accepted === true;
      payload.terms_accepted = termsAccepted;
      payload.terms_accepted_at = termsAccepted ? new Date().toISOString() : null;
    }

    const { data, error } = await supabaseAdmin
      .from('listings')
      .insert(payload)
      .select('id')
      .single();
    if (error) {
      console.error('Error inserting owner listing', error);
      return NextResponse.json(
        { error: "Cererea nu a putut fi procesata. Incearca din nou." },
        { status: 500 }
      );
    }

    const listingId = String(data.id);
    if (normalizedFacilities.length > 0) {
      const { error: relationError } = await supabaseAdmin.rpc(
        'replace_listing_facilities',
        {
          p_listing_id: listingId,
          p_facility_ids: normalizedFacilities,
          p_expected_owner_id: owner.id,
        }
      );
      if (relationError) {
        console.error('Could not save listing facilities', relationError);
        const { data: removedDraft, error: cleanupError } = await supabaseAdmin
          .from('listings')
          .delete()
          .eq('id', listingId)
          .eq('owner_id', owner.id)
          .eq('is_published', false)
          .eq('publication_status', 'draft')
          .select('id')
          .maybeSingle();
        if (cleanupError || !removedDraft) {
          console.error('Could not remove incomplete owner draft', cleanupError);
          return NextResponse.json(
            { error: 'Nu am putut salva facilitatile. Verifica drafturile din cont inainte de a retrimite formularul.' },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { error: 'Nu am putut salva facilitatile. Datele formularului au fost pastrate; incearca din nou.' },
          { status: 500 }
        );
      }
    }

    await syncListingGeoZones(supabaseAdmin, {
      listingId,
      judet: typeof payload.judet === 'string' ? payload.judet : null,
    });

    return NextResponse.json({ ok: true, id: listingId });
  } catch (error: unknown) {
    if (error instanceof OwnerAuthUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
