import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { LISTING_TYPES } from '@/lib/listingTypes';
import { LISTING_SUBMISSION_LIMITS } from '@/lib/listings/listingSubmissionRules';
import {
  invalidateSubmittedOwnerListing,
  resolveListingAccess,
} from '@/lib/server/ownerAuth';
import { validateCapacity, validatePhone } from '@/lib/validation/listing';

const ALLOWED_LISTING_TYPES = new Set<string>(
  LISTING_TYPES.map((listingType) => listingType.value)
);
const LISTING_SUBMISSION_SELECT =
  'id, title, judet, city, sat, price, capacity, camere, paturi, bai, phone, type, description, lat, lng, is_published, terms_accepted, publication_status';

type SubmissionListing = {
  title: unknown;
  judet: unknown;
  city: unknown;
  price: unknown;
  capacity: unknown;
  camere: unknown;
  paturi: unknown;
  bai: unknown;
  phone: unknown;
  type: unknown;
  description: unknown;
  lat: unknown;
  lng: unknown;
  terms_accepted: unknown;
};

function toText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isNonNegativeInteger(value: unknown) {
  const parsed = toFiniteNumber(value);
  return parsed !== null && Number.isInteger(parsed) && parsed >= 0;
}

function getSubmissionErrors(listing: SubmissionListing, imageCount: number) {
  const errors: string[] = [];
  const title = toText(listing.title);
  const judet = toText(listing.judet);
  const price = toFiniteNumber(listing.price);
  const capacity = toText(listing.capacity);
  const phone = toText(listing.phone);
  const type = toText(listing.type);
  const description = toText(listing.description);
  const lat = toFiniteNumber(listing.lat);
  const lng = toFiniteNumber(listing.lng);

  if (!title || title.toLocaleLowerCase('ro') === 'draft proprietate') {
    errors.push('Completeaza titlul cazarii.');
  } else if (title.length > LISTING_SUBMISSION_LIMITS.titleMaxLength) {
    errors.push(
      `Titlul poate avea maximum ${LISTING_SUBMISSION_LIMITS.titleMaxLength} de caractere.`
    );
  }
  if (!judet) errors.push('Completeaza judetul.');
  if (!toText(listing.city)) errors.push('Completeaza localitatea.');
  if (price === null || price <= 0) errors.push('Introdu un pret valid, mai mare decat zero.');
  if (!capacity) {
    errors.push('Completeaza capacitatea.');
  } else {
    const capacityError = validateCapacity(capacity);
    const capacityNumbers = capacity.match(/\d+/g)?.map(Number) || [];
    if (capacityError || capacityNumbers.length === 0 || capacityNumbers.some((value) => value <= 0)) {
      errors.push(capacityError || 'Capacitatea trebuie sa fie mai mare decat zero.');
    }
  }
  if (!phone) {
    errors.push('Completeaza numarul de telefon.');
  } else {
    const phoneError = validatePhone(phone);
    if (phoneError) errors.push(phoneError);
  }
  if (!type) errors.push('Selecteaza tipul cazarii.');
  else if (!ALLOWED_LISTING_TYPES.has(type)) errors.push('Tipul cazarii este invalid.');
  if (!isNonNegativeInteger(listing.camere)) {
    errors.push('Numarul de camere trebuie sa fie un numar intreg, minimum zero.');
  }
  if (!isNonNegativeInteger(listing.paturi)) {
    errors.push('Numarul de paturi trebuie sa fie un numar intreg, minimum zero.');
  }
  if (!isNonNegativeInteger(listing.bai)) {
    errors.push('Numarul de bai trebuie sa fie un numar intreg, minimum zero.');
  }
  if (description.length < LISTING_SUBMISSION_LIMITS.descriptionMinLength) {
    errors.push(
      `Descrierea trebuie sa aiba minim ${LISTING_SUBMISSION_LIMITS.descriptionMinLength} caractere.`
    );
  } else if (description.length > LISTING_SUBMISSION_LIMITS.descriptionMaxLength) {
    errors.push(
      `Descrierea trebuie sa aiba maxim ${LISTING_SUBMISSION_LIMITS.descriptionMaxLength} caractere.`
    );
  }

  const hasValidCoordinates =
    lat !== null &&
    lng !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    (lat !== 0 || lng !== 0);
  if (!hasValidCoordinates) {
    errors.push('Confirma locatia exacta a cazarii.');
  }
  if (listing.terms_accepted !== true) {
    errors.push('Accepta termenii si conditiile.');
  }
  if (imageCount < LISTING_SUBMISSION_LIMITS.minImages) {
    errors.push(`Adauga cel putin ${LISTING_SUBMISSION_LIMITS.minImages} imagini.`);
  } else if (imageCount > LISTING_SUBMISSION_LIMITS.maxImages) {
    errors.push(`Poti adauga cel mult ${LISTING_SUBMISSION_LIMITS.maxImages} imagini.`);
  }

  return errors;
}

async function rollbackSubmittedListing(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  listingId: string,
  ownerId: string | null
) {
  if (ownerId) {
    await invalidateSubmittedOwnerListing(supabaseAdmin, listingId, ownerId);
    return;
  }

  const { error } = await supabaseAdmin
    .from('listings')
    .update({
      is_published: false,
      publication_status: 'draft',
      submitted_at: null,
    })
    .eq('id', listingId)
    .eq('publication_status', 'submitted');
  if (error) throw error;
}

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, {
      windowMs: 60 * 60_000,
      max: 10,
      keyPrefix: 'listing-submit-public',
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Prea multe incercari. Te rugam sa incerci din nou mai tarziu.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (String(body.honeypot ?? '').trim()) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
    }

    const listingId = typeof body.id === 'string' ? body.id.trim() : '';
    if (!listingId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const access = await resolveListingAccess(request, listingId, supabaseAdmin);
    if (!access.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (access.kind === 'legacy-token') {
      return NextResponse.json(
        { error: 'Confirma emailul contului de proprietar pentru a trimite cazarea.' },
        { status: 403 }
      );
    }

    let listingQuery = supabaseAdmin
      .from('listings')
      .select(LISTING_SUBMISSION_SELECT)
      .eq('id', listingId);
    if (access.kind === 'owner') listingQuery = listingQuery.eq('owner_id', access.ownerId);

    const [
      { data: listing, error: listingError },
      { count: imageCount, error: imageCountError },
    ] = await Promise.all([
      listingQuery.maybeSingle(),
      supabaseAdmin
        .from('listing_images')
        .select('id', { count: 'exact', head: true })
        .eq('listing_id', listingId),
    ]);

    if (listingError) {
      return NextResponse.json({ error: listingError.message }, { status: 500 });
    }
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    if (imageCountError) {
      return NextResponse.json({ error: imageCountError.message }, { status: 500 });
    }
    if (listing.is_published === true) {
      return NextResponse.json(
        { error: 'Cazarea este deja publicata.' },
        { status: 409 }
      );
    }

    const errors = getSubmissionErrors(listing, imageCount || 0);

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors[0], errors },
        { status: 400 }
      );
    }

    const submittedAt = new Date().toISOString();
    let submitQuery = supabaseAdmin
      .from('listings')
      .update({
        is_published: false,
        publication_status: 'submitted',
        submitted_at: submittedAt,
      })
      .eq('id', listingId);
    if (access.kind === 'owner') submitQuery = submitQuery.eq('owner_id', access.ownerId);
    const { data: submittedListing, error: submitError } = await submitQuery
      .select('id')
      .maybeSingle();

    if (submitError) {
      return NextResponse.json({ error: submitError.message }, { status: 500 });
    }
    if (!submittedListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (access.kind === 'owner' || access.kind === 'staff') {
      let verifiedListingQuery = supabaseAdmin
        .from('listings')
        .select(LISTING_SUBMISSION_SELECT)
        .eq('id', listingId);
      if (access.kind === 'owner') {
        verifiedListingQuery = verifiedListingQuery.eq('owner_id', access.ownerId);
      }

      const [
        { data: verifiedListing, error: verifiedListingError },
        { count: verifiedImageCount, error: verifiedImageCountError },
      ] = await Promise.all([
        verifiedListingQuery.maybeSingle(),
        supabaseAdmin
          .from('listing_images')
          .select('id', { count: 'exact', head: true })
          .eq('listing_id', listingId),
      ]);

      const expectedOwnerId = access.kind === 'owner' ? access.ownerId : null;

      if (verifiedListingError || verifiedImageCountError || !verifiedListing) {
        await rollbackSubmittedListing(supabaseAdmin, listingId, expectedOwnerId);
        return NextResponse.json(
          {
            error:
              verifiedListingError?.message ||
              verifiedImageCountError?.message ||
              'Nu am putut confirma versiunea finala a cazarii.',
          },
          { status: verifiedListingError || verifiedImageCountError ? 500 : 409 }
        );
      }

      const verifiedErrors = getSubmissionErrors(verifiedListing, verifiedImageCount || 0);
      if (verifiedListing.publication_status !== 'submitted' || verifiedErrors.length > 0) {
        await rollbackSubmittedListing(supabaseAdmin, listingId, expectedOwnerId);
        return NextResponse.json(
          {
            error:
              verifiedErrors[0] ||
              'Cazarea a fost modificata in timpul trimiterii. Verifica modificarile si trimite din nou.',
            errors: verifiedErrors,
          },
          { status: 409 }
        );
      }
    }

    try {
      revalidatePath('/drafts');
    } catch (revalidateError) {
      console.error('[listing-submit] revalidate failed', revalidateError);
    }

    return NextResponse.json({ ok: true, status: 'submitted' });
  } catch (error: any) {
    console.error('[listing-submit]', error);
    return NextResponse.json(
      { error: "Cererea nu a putut fi procesata. Incearca din nou." },
      { status: 500 }
    );
  }
}
