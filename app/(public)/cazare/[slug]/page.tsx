import type { Metadata } from 'next';
import { cache, Suspense } from 'react';
import { headers } from 'next/headers';
import { getDraftRoleFromRequest } from '@/lib/draftsAuth';
import { notFound, permanentRedirect } from 'next/navigation';
import ListingClient, { type Listing } from './ListingClient';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';
import { buildPropertyBreadcrumbJsonLd, buildPropertyJsonLd, serializeJsonLd } from '@/lib/jsonLd';
import { buildListingMetaTitle, clampMetaDescription, clampMetaTitle } from '@/lib/seoCopy';
import SeoRelatedLinks, { type SeoRelatedLink } from '@/components/seo/SeoRelatedLinks';
import { LISTING_TYPES } from '@/lib/listingTypes';
import { getCounties } from '@/lib/counties';
import { normalizeRegionText } from '@/lib/regions';
import { buildTypeCountyPath } from '@/lib/typeCountyRoutes';
import { buildTypeFacilityCountyPath } from '@/lib/locationRoutes';
import { fetchTypeFacilityCountyCombos } from '@/lib/typeFacilityCountySeo';
import { countPublishedListingsByTypeAndCounty } from '@/lib/seoListingsCounts';
import { hasMinimumPublishedListings } from '@/lib/seoIndexing';
import { distinctListingCollections } from '@/lib/publicListingCollections';

export const revalidate = 3600;
const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
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
  seo_title?: string | null;
  seo_description?: string | null;
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

type ListingPageData = Listing & {
  judet?: string;
  city?: string;
  sat?: string;
  seoTitle?: string;
  seoDescription?: string;
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

function getCanonicalListingPath(slug: string | null | undefined, fallbackSlug: string) {
  return `/cazare/${slug || fallbackSlug}`;
}

function buildSearchParamsString(searchParams?: Awaited<PageProps['searchParams']>) {
  const params = new URLSearchParams();
  if (!searchParams) return "";

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.append(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") params.append(key, item);
      }
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function buildListingRelatedLinks(listing: ListingPageData): Promise<SeoRelatedLink[]> {
  const listingType = LISTING_TYPES.find((type) => type.value === listing.type) || null;
  const county =
    getCounties().find(
      (item) => normalizeRegionText(item.name) === normalizeRegionText(listing.judet || "")
    ) || null;
  const links: SeoRelatedLink[] = [
    {
      href: "/cazari",
      label: "Toate categoriile de cazare",
      description: "Compară tipurile de proprietăți disponibile în catalog.",
    },
  ];

  if (listingType) {
    links.push({
      href: `/cazari/${listingType.slug}`,
      label: listingType.label,
      description: `Vezi și alte proprietăți din categoria ${listingType.singular.toLowerCase()}.`,
    });
  }

  if (county) {
    links.push({
      href: `/judet/${county.slug}`,
      label: `Cazări în județul ${county.name}`,
      description: "Descoperă toate proprietățile publicate în același județ.",
    });
  }

  if (listingType && county) {
    const supabaseAdmin = getSupabaseAdmin();
    const [typeCountyCount, combinations] = await Promise.all([
      countPublishedListingsByTypeAndCounty(
        supabaseAdmin,
        listingType.value,
        county.name
      ),
      fetchTypeFacilityCountyCombos(supabaseAdmin, { publishedOnly: true }),
    ]);

    if (hasMinimumPublishedListings(typeCountyCount)) {
      links.push({
        href: buildTypeCountyPath(listingType.slug, county.slug),
        label: `${listingType.label} în județul ${county.name}`,
        description: "Restrânge selecția după tip și județ.",
      });
    }

    const combinationByFacilityId = new Map(
      combinations
        .filter(
          (combination) =>
            combination.typeSlug === listingType.slug &&
            combination.countySlug === county.slug &&
            hasMinimumPublishedListings(combination.listingIds.length)
        )
        .map((combination) => [combination.facilityId, combination] as const)
    );
    const eligibleCombinations = distinctListingCollections(listing.facilities
      .flatMap((facility) => {
        const combination = combinationByFacilityId.get(facility.id);
        return combination ? [combination] : [];
      }))
      .filter((combination) => combination.listingIds.length < typeCountyCount)
      .slice(0, 3);

    eligibleCombinations.forEach((combination) => {
      links.push({
        href: buildTypeFacilityCountyPath(
          listingType.slug,
          county.slug,
          combination.facilitySlug
        ),
        label: `${listingType.label} cu ${combination.facilityName}`,
        description: `Explorează proprietăți cu ${combination.facilityName} în județul ${county.name}.`,
      });
    });
  }

  return links;
}

async function fetchListing(slug: string, searchParams?: Awaited<PageProps['searchParams']>) {
  const supabaseAdmin = getSupabaseAdmin();
  const previewMode = searchParams?.preview === '1' || searchParams?.draft === '1';
  if (previewMode) {
    const role = await getDraftRoleFromRequest({ headers: await headers() });
    if (role !== 'admin' && role !== 'staff') return null;
  }
  const idParam = typeof searchParams?.id === 'string' ? searchParams?.id : null;
  const slugValue = String(slug || '').trim();

  const baseSelect = `
    id, title, slug, city, sat, judet, type, capacity, price, phone, description,
    seo_title, seo_description,
    lat, lng, camere, paturi, bai, is_published,
    listing_images(image_url, display_order),
    listing_facilities(
      facilities(id, name)
    )
  `;
  const baseListingSelect = `
    id, title, slug, city, sat, judet, type, capacity, price, phone, description,
    seo_title, seo_description,
    lat, lng, camere, paturi, bai, is_published
  `;

  const baseQuery = supabaseAdmin.from('listings').select(baseSelect);
  const baseListingQuery = supabaseAdmin.from('listings').select(baseListingSelect);

  const runQuery = async (field: 'id' | 'slug', value: string) => {
    let query = baseQuery.eq(field, value);
    if (!previewMode) query = query.eq('is_published', true)
      .in('publication_status', ['active', 'expiring'])
      .or(`publication_expires_at.is.null,publication_expires_at.gt.${new Date().toISOString()}`);
    const { data, error } = await query
      .order('display_order', { foreignTable: 'listing_images', ascending: true })
      .maybeSingle();
    if (!error && data) return data as unknown as ListingRow;

    if (error) {
      console.error('[listing] base query failed', { field, value, error: error.message });
    }

    let fallbackQuery = baseListingQuery.eq(field, value);
    if (!previewMode) fallbackQuery = fallbackQuery.eq('is_published', true)
      .in('publication_status', ['active', 'expiring'])
      .or(`publication_expires_at.is.null,publication_expires_at.gt.${new Date().toISOString()}`);
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

  const listing: ListingPageData = {
    id: row.id,
    slug: row.slug ?? undefined,
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
    seoTitle:
      typeof row.seo_title === 'string' && row.seo_title.trim().length > 0
        ? row.seo_title.trim()
        : undefined,
    seoDescription:
      typeof row.seo_description === 'string' && row.seo_description.trim().length > 0
        ? row.seo_description.trim()
        : undefined,
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

const fetchPublicListing = cache((slug: string) => fetchListing(slug));

export async function generateMetadata({ params: paramsPromise, searchParams: searchParamsPromise }: PageProps): Promise<Metadata> {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  if (searchParams?.preview === '1' || searchParams?.draft === '1') {
    return { robots: { index: false, follow: false } };
  }
  const listing = await fetchPublicListing(params.slug);
  if (!listing) return {};

  const description = clampMetaDescription(listing.seoDescription || listing.description);
  const image = listing.images?.[0] || '/images/logo.svg';
  const localityLabel = listing.sat || listing.city || "";
  const title = listing.seoTitle
    ? clampMetaTitle(listing.seoTitle)
    : buildListingMetaTitle(listing.title, localityLabel, listing.judet);
  const canonicalPath = getCanonicalListingPath(listing.slug, params.slug);
  const canonical = new URL(canonicalPath, siteUrl).toString();
  const absoluteImage =
    image.startsWith("http://") || image.startsWith("https://")
      ? image
      : new URL(image, siteUrl).toString();
  const shareImage = new URL(
    `/api/og-image?src=${encodeURIComponent(absoluteImage)}`,
    siteUrl
  ).toString();
  const imageExtension = absoluteImage.split("?")[0]?.split(".").pop()?.toLowerCase();
  const imageType =
    imageExtension === "png"
      ? "image/png"
      : imageExtension === "webp"
      ? "image/webp"
      : "image/jpeg";

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName: 'cabn',
      locale: 'ro_RO',
      images: [
        {
          url: shareImage,
          secureUrl: shareImage,
          width: 1200,
          height: 630,
          type: imageType,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [shareImage],
    },
  };
}

async function ListingRelatedLinks({ listing }: { listing: ListingPageData }) {
  const relatedLinks = await buildListingRelatedLinks(listing);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <SeoRelatedLinks
        title={`Continuă explorarea din ${listing.judet || "România"}`}
        description="Compară proprietăți similare după tip, județ și facilitățile care contează pentru sejurul tău."
        links={relatedLinks}
      />
    </div>
  );
}

export default async function CazarePage({ params: paramsPromise, searchParams: searchParamsPromise }: PageProps) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const previewRequested = searchParams?.preview === '1' || searchParams?.draft === '1';
  const listing = !previewRequested && typeof searchParams?.id !== 'string'
    ? await fetchPublicListing(params.slug)
    : await fetchListing(params.slug, searchParams);
  if (!listing) {
    notFound();
  }

  const canonicalPath = getCanonicalListingPath(listing.slug, params.slug);
  if (!previewRequested && params.slug !== (listing.slug || params.slug)) {
    permanentRedirect(`${canonicalPath}${buildSearchParamsString(searchParams)}`);
  }

  const canonicalUrl = new URL(canonicalPath, siteUrl).toString();
  const jsonLd = buildPropertyJsonLd({
    url: canonicalUrl,
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
    pageUrl: canonicalUrl,
    listingName: listing.title,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <ListingClient data={listing} />
      <Suspense fallback={null}>
        <ListingRelatedLinks listing={listing} />
      </Suspense>
    </>
  );
}
