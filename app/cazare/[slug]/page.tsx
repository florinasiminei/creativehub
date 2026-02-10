import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListingClient, { type Listing } from './ListingClient';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';
import { buildPropertyBreadcrumbJsonLd, buildPropertyJsonLd } from '@/lib/jsonLd';

export const revalidate = 60 * 60;
const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

type ListingRow = {
  id: string;
  title: string;
  slug?: string | null;
  city?: string | null;
  sat?: string | null;
  judet?: string | null;
  type: string;
  capacity: string | number | null;
  price: number | string | null;
  phone?: string | null;
  description?: string | null;
  highlights?: string[] | string | null;
  lat?: number | null;
  lng?: number | null;
  camere?: number | string | null;
  paturi?: number | string | null;
  bai?: number | string | null;
  is_published?: boolean | null;
  listing_images?: { image_url: string | null; display_order: number | null }[];
  listing_facilities?: { facilities?: { id: string; name: string } | null }[];
};

function parseCount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCapacity(value: unknown) {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const match = String(value ?? '').match(/\d+/);
  return match ? match[0] : '1';
}

function parseHighlights(raw: unknown) {
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }
  if (typeof raw !== 'string' || raw.trim().length === 0) return [];
  const rawString = raw.trim();
  if (
    (rawString.startsWith('[') && rawString.endsWith(']')) ||
    (rawString.startsWith('{') && rawString.endsWith('}'))
  ) {
    try {
      const parsed = JSON.parse(rawString);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim());
      }
    } catch {
      // ignore JSON parse failures
    }
  }
  return rawString
    .split(/\r?\n|[;,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

async function fetchListing(slug: string, searchParams?: PageProps['searchParams']) {
  const supabaseAdmin = getSupabaseAdmin();
  const previewMode = searchParams?.preview === '1' || searchParams?.draft === '1';
  const idParam = typeof searchParams?.id === 'string' ? searchParams?.id : null;
  const slugValue = String(slug || '').trim();

  const baseSelect = `
    id, title, slug, city, sat, judet, type, capacity, price, phone, description,
    lat, lng, camere, paturi, bai, is_published,
    listing_images(image_url, display_order),
    listing_facilities(
      facilities(id, name)
    )
  `;
  const baseListingSelect = `
    id, title, slug, city, sat, judet, type, capacity, price, phone, description,
    lat, lng, camere, paturi, bai, is_published
  `;

  const baseQuery = supabaseAdmin.from('listings').select(baseSelect);
  const baseListingQuery = supabaseAdmin.from('listings').select(baseListingSelect);

  const runQuery = async (field: 'id' | 'slug', value: string) => {
    let query = baseQuery.eq(field, value);
    if (!previewMode) query = query.eq('is_published', true);
    const { data, error } = await query
      .order('display_order', { foreignTable: 'listing_images', ascending: true })
      .maybeSingle();
    if (!error && data) return data as unknown as ListingRow;

    if (error) {
      console.error('[listing] base query failed', { field, value, error: error.message });
    }

    let fallbackQuery = baseListingQuery.eq(field, value);
    if (!previewMode) fallbackQuery = fallbackQuery.eq('is_published', true);
    const { data: baseRow, error: baseError } = await fallbackQuery.maybeSingle();
    if (baseError || !baseRow) {
      if (baseError) {
        console.error('[listing] base listing fallback failed', {
          field,
          value,
          error: baseError.message,
        });
      }
      return null;
    }

    const listingId = String(baseRow.id);
    const [{ data: images }, { data: facilitiesRows }] = await Promise.all([
      supabaseAdmin
        .from('listing_images')
        .select('image_url, display_order')
        .eq('listing_id', listingId)
        .order('display_order', { ascending: true }),
      supabaseAdmin
        .from('listing_facilities')
        .select('facilities(id, name)')
        .eq('listing_id', listingId),
    ]);

    const normalizedFacilities = (facilitiesRows || []).flatMap((row) => {
      const facilities = Array.isArray(row?.facilities)
        ? row.facilities
        : row?.facilities
        ? [row.facilities]
        : [];
      return facilities.map((facility) => ({ facilities: facility }));
    });

    return {
      ...(baseRow as ListingRow),
      listing_images: (images || []) as ListingRow['listing_images'],
      listing_facilities: normalizedFacilities as ListingRow['listing_facilities'],
    };
  };

  let row: ListingRow | null = null;
  if (idParam) {
    row = await runQuery('id', idParam);
  } else if (slugValue) {
    row = await runQuery('slug', slugValue);
  }

  if (!row && !idParam && slugValue) {
    const uuidMatch = slugValue.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    );
    const numericMatch = slugValue.match(/(?:^|-)\d+(?:$)/);
    const idFallback = uuidMatch?.[0] ?? (numericMatch ? numericMatch[0].replace(/^-/, '') : null);
    if (idFallback) {
      row = await runQuery('id', idFallback);
    }
  }

  if (!row) return null;

  const images =
    row.listing_images?.map((i) => i.image_url).filter((url): url is string => !!url) || [];
  const displayImages = images.length > 0 ? images : ['/fallback.svg'];

  const facilities =
    row.listing_facilities
      ?.map((f) => f?.facilities)
      .filter((f): f is { id: string; name: string } => !!f?.id && !!f?.name) || [];

  const descriptionFromDb =
    typeof row.description === 'string' && row.description.trim().length > 0
      ? row.description.trim()
      : '';

  const cityLabel = row.sat ? `${row.city} (${row.sat})` : row.city;
  const locationLabel = [cityLabel, row.judet].filter(Boolean).join(', ') || 'România';
  const descriptionFallback = `Bucurați-vă de o ședere de neuitat la ${row.title}, o proprietate excepțională situată în inima ${locationLabel}. Această locație oferă un amestec perfect de confort modern și farmec local, fiind ideală pentru cupluri, familii sau grupuri de prieteni care doresc să exploreze frumusețea zonei.

Interiorul este amenajat cu gust, oferind spații generoase și luminoase. Fiecare detaliu a fost gândit pentru a vă asigura o experiență relaxantă și plăcută. De la bucătăria complet utilată, perfectă pentru a pregăti mese delicioase, până la dormitoarele confortabile, totul este pregătit pentru a vă simți ca acasă.`;

  const highlights = parseHighlights(row.highlights);
  const highlightsFallback = [
    'Priveliște montană superbă de la balcon',
    'Acces direct la trasee de drumeții',
    'Liniște și intimitate deplină',
    'Curte spațioasă cu grătar și foișor',
  ];

  const listing: Listing & { judet?: string; city?: string; sat?: string } = {
    id: row.id,
    title: row.title,
    city: row.city ?? undefined,
    sat: row.sat ?? undefined,
    judet: row.judet ?? undefined,
    type: row.type,
    capacity: parseCapacity(row.capacity),
    price: typeof row.price === 'number' ? row.price : parseCount(row.price),
    phone: row.phone ? String(row.phone) : undefined,
    images: displayImages,
    facilities,
    description: descriptionFromDb.length > 0 ? descriptionFromDb : descriptionFallback,
    highlights: highlights.length > 0 ? highlights : highlightsFallback,
    camere: parseCount(row.camere),
    paturi: parseCount(row.paturi),
    bai: parseCount(row.bai),
    latitude: row.lat ?? null,
    longitude: row.lng ?? null,
    searchRadius: null,
  };

  return listing;
}

function truncate(text: string, max = 160) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const listing = await fetchListing(params.slug);
  if (!listing) return {};
  const description = truncate(listing.description);
  const image = listing.images?.[0] || '/images/logo.svg';
    const cityLabel = listing.city
      ? listing.sat
        ? `${listing.city} (${listing.sat})`
        : listing.city
      : "";
    const locationLabel = [cityLabel, listing.judet].filter(Boolean).join(", ");
    const baseTitle = listing.title;
    const titleSuffix = locationLabel ? ` | Cazare în ${locationLabel}` : "";
    const title = `${baseTitle}${titleSuffix}`;
    const canonical = new URL(`/cazare/${params.slug}`, siteUrl).toString();
    const url = canonical;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        type: 'website',
        url,
        images: [{ url: image }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    };
}

export default async function CazarePage({ params, searchParams }: PageProps) {
  const listing = await fetchListing(params.slug, searchParams);
  if (!listing) {
    notFound();
  }

  const jsonLd = buildPropertyJsonLd({
    url: `${siteUrl}/cazare/${params.slug}`,
    name: listing.title,
    description: listing.description,
    images: listing.images,
    address: {
      locality: listing.city,
      region: listing.judet,
    },
    geo:
      listing.latitude && listing.longitude
        ? { lat: listing.latitude, lng: listing.longitude }
        : undefined,
    priceRange: listing.price ? String(listing.price) : undefined,
    amenities: listing.facilities.map((f) => f.name),
  });

  const breadcrumbJsonLd = buildPropertyBreadcrumbJsonLd({
    siteUrl,
    pageUrl: `${siteUrl}/cazare/${params.slug}`,
    listingName: listing.title,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ListingClient data={listing} />
    </>
  );
}
