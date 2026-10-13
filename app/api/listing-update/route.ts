import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { syncListingGeoZones } from '@/lib/geoZones';
import {
  invalidateSubmittedOwnerListing,
  resolveListingAccess,
} from '@/lib/server/ownerAuth';
import { LISTING_TYPES } from '@/lib/listingTypes';
import { slugify } from '@/lib/utils';
import {
  validateCapacity,
  validateDescriptionLength,
  validatePhone,
} from '@/lib/validation/listing';

const MIN_DESCRIPTION_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const ALLOWED_LISTING_TYPES = new Set<string>(
  LISTING_TYPES.map((listingType) => listingType.value)
);

function toText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function validateOwnerUpdate(body: Record<string, unknown>) {
  const errors: string[] = [];
  const title = toText(body.title);
  const judet = toText(body.judet);
  const city = toText(body.city);
  const phone = toText(body.phone);
  const type = toText(body.type);
  const description = toText(body.description);
  const capacity = toText(body.capacity);
  const price = toNumber(body.price);
  const lat = toNumber(body.lat) ?? toNumber(body.latitude);
  const lng = toNumber(body.lng) ?? toNumber(body.longitude);

  if (!title || title.toLocaleLowerCase('ro') === 'draft proprietate') {
    errors.push('Completeaza titlul cazarii.');
  }
  if (!judet) errors.push('Completeaza judetul.');
  if (!city) errors.push('Completeaza localitatea.');
  if (price === null || price <= 0) {
    errors.push('Introdu un pret valid, mai mare decat zero.');
  }
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
  if (!type || !ALLOWED_LISTING_TYPES.has(type)) {
    errors.push('Selecteaza un tip valid de cazare.');
  }

  const descriptionError = validateDescriptionLength(
    description,
    MIN_DESCRIPTION_LENGTH,
    MAX_DESCRIPTION_LENGTH
  );
  if (descriptionError) errors.push(descriptionError);

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

  return errors;
}

async function ensureUniqueSlug(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  baseSlug: string,
  listingId: string
) {
  const normalizedBase = slugify(baseSlug) || 'cazare';
  let candidate = normalizedBase;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('id')
      .eq('slug', candidate)
      .limit(1);

    if (error) return candidate;
    if (!data || data.length === 0 || String(data[0]?.id) === String(listingId)) return candidate;

    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
    if (suffix > 10_000) {
      return `${normalizedBase}-${Date.now().toString(36)}`;
    }
  }
}

export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, { windowMs: 60_000, max: 60, keyPrefix: 'listing-update' });
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { id, title, slug, judet, city, sat, price, capacity, phone, description, type, facilities, is_published, camere, paturi, bai } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    if (
      Object.prototype.hasOwnProperty.call(body, 'is_published') &&
      typeof is_published !== 'boolean'
    ) {
      return NextResponse.json({ error: 'Invalid publication state' }, { status: 400 });
    }

    const access = await resolveListingAccess(request, String(id), supabaseAdmin);
    if (!access.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (access.kind === 'owner') {
      const ownerErrors = validateOwnerUpdate(body as Record<string, unknown>);
      if (ownerErrors.length > 0) {
        return NextResponse.json(
          { error: ownerErrors[0], errors: ownerErrors },
          { status: 400 }
        );
      }
    }
    const hasRole = access.kind === 'staff';
    if (!hasRole) {
      const forbiddenTokenFields = [
        'owner_id',
        'display_order',
        'search_radius',
        'publication_status',
        'submitted_at',
        'published_at',
        'publication_expires_at',
        'renewal_due_at',
        'created_by_actor',
        'edit_token',
        'seo_title',
        'seo_description',
      ];
      const forbiddenField = forbiddenTokenFields.find((field) =>
        Object.prototype.hasOwnProperty.call(body, field)
      );
      if (forbiddenField) {
        return NextResponse.json(
          { error: `Campul ${forbiddenField} poate fi modificat doar din backoffice.` },
          { status: 403 }
        );
      }
      if (
        Object.prototype.hasOwnProperty.call(body, 'is_published') &&
        is_published !== false
      ) {
        return NextResponse.json(
          { error: 'Publicarea poate fi facuta doar din backoffice.' },
          { status: 403 }
        );
      }

      const textLimits: Array<[string, unknown, number]> = [
        ['title', title, 160],
        ['slug', slug, 200],
        ['judet', judet, 120],
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
    }

    if (hasRole) {
      for (const field of ['seo_title', 'seo_description'] as const) {
        if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
        if (body[field] !== null && typeof body[field] !== 'string') {
          return NextResponse.json({ error: `Camp invalid: ${field}` }, { status: 400 });
        }
      }
    }

    let normalizedFacilities: string[] | null = null;
    if (Array.isArray(facilities)) {
      normalizedFacilities = Array.from(
        new Set(facilities.map((facilityId: unknown) => String(facilityId)).filter(Boolean))
      );
      if (normalizedFacilities.some((facilityId) => !isUuid(facilityId))) {
        return NextResponse.json({ error: 'Facilitati invalide' }, { status: 400 });
      }
      if (normalizedFacilities.length > 0) {
        const { data: validFacilities, error: facilitiesValidationError } = await supabaseAdmin
          .from('facilities')
          .select('id')
          .in('id', normalizedFacilities);
        if (facilitiesValidationError) {
          return NextResponse.json({ error: facilitiesValidationError.message }, { status: 500 });
        }
        if ((validFacilities || []).length !== normalizedFacilities.length) {
          return NextResponse.json({ error: 'Facilitati invalide' }, { status: 400 });
        }
      }
    }

    if (access.kind === 'owner') {
      await invalidateSubmittedOwnerListing(supabaseAdmin, String(id), access.ownerId);
    }

    const updateData: any = {};
    if (hasRole) {
      for (const field of ['seo_title', 'seo_description'] as const) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          updateData[field] = typeof body[field] === 'string' ? body[field].trim() || null : null;
        }
      }
    }
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) {
      updateData.slug = await ensureUniqueSlug(supabaseAdmin, String(slug || title || 'cazare'), String(id));
    }
    if (judet !== undefined) updateData.judet = judet;
    if (city !== undefined) updateData.city = city;
    if (sat !== undefined) updateData.sat = sat;
    if (price !== undefined) updateData.price = price;
    const normalizeCapacity = (value: unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      if (typeof value !== 'string') return null;
      return value
        .replace(/[–—]/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/\s*([-/])\s*/g, '$1')
        .trim();
    };
    if (capacity !== undefined) updateData.capacity = normalizeCapacity(capacity);
    if (phone !== undefined) updateData.phone = phone;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (is_published !== undefined) updateData.is_published = is_published;
    if (is_published === false) {
      updateData.publication_status = 'draft';
    }
    if (Object.prototype.hasOwnProperty.call(body, 'newsletter_opt_in')) {
      updateData.newsletter_opt_in = (body as any).newsletter_opt_in === true;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'terms_accepted')) {
      const termsAccepted = (body as any).terms_accepted === true;
      updateData.terms_accepted = termsAccepted;
      updateData.terms_accepted_at = termsAccepted ? new Date().toISOString() : null;
    }
    if ((body as any).lat !== undefined) updateData.lat = toNumber((body as any).lat);
    if ((body as any).lng !== undefined) updateData.lng = toNumber((body as any).lng);
    if (camere !== undefined) updateData.camere = toNumber(camere);
    if (paturi !== undefined) updateData.paturi = toNumber(paturi);
    if (bai !== undefined) updateData.bai = toNumber(bai);
    if ((body as any).latitude !== undefined && updateData.lat === undefined) updateData.lat = toNumber((body as any).latitude);
    if ((body as any).longitude !== undefined && updateData.lng === undefined) updateData.lng = toNumber((body as any).longitude);
    if ((body as any).search_radius !== undefined) updateData.search_radius = (body as any).search_radius;

    // If publishing and display_order is missing, assign the next counter value.
    if (is_published === true) {
      try {
        const [
          { data: currentRow, error: currentErr },
          { data: publicationPlan },
        ] = await Promise.all([
          supabaseAdmin
            .from('listings')
            .select('display_order, published_at, publication_expires_at')
            .eq('id', id)
            .single(),
          supabaseAdmin
            .from('publication_plans')
            .select('renewal_window_days')
            .eq('code', 'annual_standard')
            .eq('active', true)
            .maybeSingle(),
        ]);

        if (!currentRow?.published_at) {
          const publishedAt = new Date();
          const expiresAt = new Date(publishedAt);
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          const renewalDueAt = new Date(expiresAt);
          renewalDueAt.setDate(
            renewalDueAt.getDate() -
              Math.max(
                1,
                Number(publicationPlan?.renewal_window_days || 60)
              )
          );
          updateData.published_at = publishedAt.toISOString();
          updateData.publication_expires_at = expiresAt.toISOString();
          updateData.renewal_due_at = renewalDueAt.toISOString();
          updateData.publication_status = 'active';
        } else {
          updateData.publication_status = 'active';
        }
        if (!currentErr && (currentRow?.display_order === null || currentRow?.display_order === undefined)) {
          const { data: orderRows, error: orderErr } = await supabaseAdmin
            .from('listings')
            .select('display_order')
            .order('display_order', { ascending: false, nullsFirst: false })
            .limit(1);
          if (!orderErr) {
            const maxOrder = orderRows?.[0]?.display_order;
            updateData.display_order = typeof maxOrder === 'number' ? maxOrder + 1 : 1;
          }
        }
      } catch {
        // ignore if column does not exist yet
      }
    }

    let updateQuery = supabaseAdmin.from('listings').update(updateData).eq('id', id);
    if (access.kind === 'owner') updateQuery = updateQuery.eq('owner_id', access.ownerId);
    let { data: updatedRow, error: upErr } = await updateQuery.select('id').maybeSingle();
    if (
      upErr &&
      access.kind !== 'owner' &&
      /lat|lng|latitude|longitude|search_radius|camere|paturi|bai|newsletter_opt_in|terms_accepted|terms_accepted_at|published_at|publication_expires_at|renewal_due_at|publication_status/i.test(upErr.message || '')
    ) {
      const fallbackUpdate = { ...updateData };
      const message = String(upErr.message || '');
      if (/published_at|publication_expires_at|renewal_due_at|publication_status/i.test(message)) {
        delete fallbackUpdate.published_at;
        delete fallbackUpdate.publication_expires_at;
        delete fallbackUpdate.renewal_due_at;
        delete fallbackUpdate.publication_status;
      }
      if (/newsletter_opt_in/i.test(message)) {
        delete fallbackUpdate.newsletter_opt_in;
      }
      if (/terms_accepted|terms_accepted_at/i.test(message)) {
        delete fallbackUpdate.terms_accepted;
        delete fallbackUpdate.terms_accepted_at;
      }
      if (/search_radius/i.test(message) && !/lat|lng|latitude|longitude/i.test(message)) {
        delete fallbackUpdate.search_radius;
      }
      if (/lat|lng|latitude|longitude/i.test(message)) {
        delete fallbackUpdate.lat;
        delete fallbackUpdate.lng;
        delete fallbackUpdate.search_radius;
      }
      const fallbackQuery = supabaseAdmin.from('listings').update(fallbackUpdate).eq('id', id);
      ({ data: updatedRow, error: upErr } = await fallbackQuery.select('id').maybeSingle());
    }
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    if (!updatedRow) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    // update facilities
    if (normalizedFacilities) {
      const { error: facilitiesReplaceError } = await supabaseAdmin.rpc(
        'replace_listing_facilities',
        {
          p_listing_id: String(id),
          p_facility_ids: normalizedFacilities,
          p_expected_owner_id:
            access.kind === 'owner' ? access.ownerId : null,
        }
      );
      if (facilitiesReplaceError) {
        const ownerChanged = /proprietarul s-a schimbat/i.test(
          facilitiesReplaceError.message || ''
        );
        return NextResponse.json(
          {
            error: ownerChanged
              ? 'Accesul la proprietate s-a schimbat. Reincarca pagina.'
              : facilitiesReplaceError.message,
          },
          { status: ownerChanged ? 409 : 500 }
        );
      }
    }

    if (access.kind === 'owner') {
      await invalidateSubmittedOwnerListing(supabaseAdmin, String(id), access.ownerId);
    }

    try {
      const { data: listingRow } = await supabaseAdmin
        .from('listings')
        .select('slug, type, is_published')
        .eq('id', id)
        .maybeSingle();

      revalidatePath('/');
      revalidatePath('/cazari');
      revalidatePath('/cazari/[type]', 'page');
      revalidatePath('/cazari/[type]/[location]', 'page');
      revalidatePath('/cazari/[type]/[location]/[slug]', 'page');
      revalidatePath('/judet/[slug]', 'page');
      revalidatePath('/localitate/[slug]', 'page');
      revalidatePath('/regiune/[slug]', 'page');
      if (listingRow?.slug) revalidatePath(`/cazare/${listingRow.slug}`);
      revalidatePath('/drafts');
      revalidatePath('/sitemap.xml');
    } catch (revalidateErr) {
      console.error('[listing-update] revalidate failed', revalidateErr);
    }

    if (judet !== undefined) {
      let nextJudet = judet;
      if (nextJudet === undefined) {
        const { data: currentRow } = await supabaseAdmin
          .from('listings')
          .select('judet')
          .eq('id', id)
          .maybeSingle();
        nextJudet = currentRow?.judet ?? null;
      }
      await syncListingGeoZones(supabaseAdmin, {
        listingId: id,
        judet: typeof nextJudet === 'string' ? nextJudet : null,
        replace: true,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Cererea nu a putut fi procesata. Incearca din nou." }, { status: 500 });
  }
}
