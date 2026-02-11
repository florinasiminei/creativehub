import Link from 'next/link';
import { notFound } from 'next/navigation';
import ListingsGrid from '@/components/listing/ListingGrid';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { mapListingSummary } from '@/lib/transformers';
import { getTypeBySlug, LISTING_TYPES } from '@/lib/listingTypes';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';
import { hasMinimumPublishedListings } from '@/lib/seoIndexing';
import { findCountyBySlug, getCounties } from '@/lib/counties';
import { allRegions, findRegionBySlug, normalizeRegionText } from '@/lib/regions';
import { slugify } from '@/lib/utils';
import { buildFaqJsonLd, buildListingPageJsonLd } from '@/lib/jsonLd';
import { getFaqs } from '@/lib/faqData';
import type { ListingRaw } from '@/lib/types';
import type { Cazare } from '@/lib/utils';

export const revalidate = 60 * 60 * 6; // 6 hours

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: {
    type: string;
    location: string;
  };
};

function resolveRegionCountyNames(regionCounties: string[]): string[] {
  const counties = getCounties();
  const byKey = new Map(counties.map((county) => [normalizeRegionText(county.name), county.name] as const));
  const resolved = regionCounties
    .map((county) => {
      const byNormalized = byKey.get(normalizeRegionText(county));
      if (byNormalized) return byNormalized;
      const fuzzy = findCountyBySlug(slugify(String(county || '')));
      return fuzzy?.name || county;
    })
    .filter(Boolean);
  return Array.from(new Set(resolved));
}

export async function generateStaticParams() {
  const params: Array<{ type: string; location: string }> = [];
  for (const type of LISTING_TYPES) {
    for (const region of allRegions) {
      params.push({ type: type.slug, location: region.slug });
    }
  }
  return params;
}

async function getPublishedListingsCountForLocation(
  typeValue: string,
  region: { counties: string[]; type: string; coreCities?: string[] }
): Promise<number> {
  const countyNames = resolveRegionCountyNames(region.counties);
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('city')
    .eq('is_published', true)
    .eq('type', typeValue)
    .in('judet', countyNames);

  if (error) return Number.POSITIVE_INFINITY;

  const rows = (data || []) as Array<{ city?: string | null }>;
  const normalizedMetroCities = region.coreCities
    ? new Set(region.coreCities.map((c) => normalizeRegionText(c)))
    : null;

  if (region.type !== "metro") return rows.length;

  let count = 0;
  for (const row of rows) {
    const cityNorm = normalizeRegionText(String(row?.city || ""));
    if (normalizedMetroCities && normalizedMetroCities.has(cityNorm)) count += 1;
  }
  return count;
}

export async function generateMetadata({ params }: PageProps) {
  const listingType = getTypeBySlug(params.type);
  const region = findRegionBySlug(params.location);

  if (!listingType || !region) return {};

  const title = `${listingType.label} in ${region.name}`;
  const description = `Descopera ${listingType.label.toLowerCase()} in ${region.name}, atent selectate, cu rezervare direct la gazda.`;
  const canonical = new URL(`/cazari/${listingType.slug}/${region.slug}`, siteUrl).toString();
  const publishedListingsCount = await getPublishedListingsCountForLocation(listingType.value, region);
  const shouldIndex = hasMinimumPublishedListings(publishedListingsCount);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
    },
    robots: shouldIndex ? undefined : { index: false, follow: true },
  };
}


async function getListingsForLocation(
  typeValue: string,
  region: { counties: string[]; type: string; coreCities?: string[] }
): Promise<Cazare[]> {
  const countyNames = resolveRegionCountyNames(region.counties);
  const supabaseAdmin = getSupabaseAdmin();
  const baseSelect = `
    id, title, slug, type, judet, city, sat, capacity, price, phone, is_published, display_order,
    camere, paturi, bai,
    listing_images(image_url, display_order),
    listing_facilities(
      facilities(id, name)
    )
  `;

  // First attempt with explicit display_order
  const withOrder = await supabaseAdmin
    .from('listings')
    .select(baseSelect)
    .eq('is_published', true)
    .eq('type', typeValue)
    .in('judet', countyNames)
    .order('display_order', { ascending: false, nullsFirst: false })
    .order('display_order', { foreignTable: 'listing_images', ascending: true })
    .limit(1, { foreignTable: 'listing_images' });

  let data = withOrder.data;
  let error = withOrder.error;

  // Fallback if the first order fails (e.g. on a view without the column)
  if (error && String(error.message || '').includes('display_order')) {
    const fallback = await supabaseAdmin
      .from('listings')
      .select(baseSelect)
      .eq('is_published', true)
      .eq('type', typeValue)
      .in('judet', countyNames)
      .order('display_order', { foreignTable: 'listing_images', ascending: true })
      .limit(1, { foreignTable: 'listing_images' });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  const rows = (data as unknown as ListingRaw[]) || [];
  const normalizedMetroCities = region.coreCities
    ? new Set(region.coreCities.map((c) => normalizeRegionText(c)))
    : null;

  const filtered =
    region.type === "metro"
      ? rows.filter((row) => {
          const cityNorm = normalizeRegionText(String((row as any).city || ""));
          return normalizedMetroCities ? normalizedMetroCities.has(cityNorm) : false;
        })
      : rows;

  return filtered.map((row) => mapListingSummary(row));
}

export default async function CazariLocationPage({ params }: PageProps) {
  const listingType = getTypeBySlug(params.type);
  const region = findRegionBySlug(params.location);

  if (!listingType || !region) {
    return notFound();
  }

  const listings = await getListingsForLocation(listingType.value, region);
  const pageUrl = `${siteUrl}/cazari/${listingType.slug}/${region.slug}`;
  const description = `Descopera cele mai frumoase ${listingType.label.toLowerCase()} din ${region.name}. Toate proprietatile sunt verificate si ofera contact direct cu gazda pentru o experienta autentica.`;
  
  const listingJsonLd = buildListingPageJsonLd({
    siteUrl,
    pageUrl,
    typeLabel: listingType.label,
    typeSlug: listingType.slug,
    locationLabel: region.name,
    locationSlug: region.slug,
    description,
    items: listings.map(l => ({
      name: l.title,
      url: `${siteUrl}/cazare/${l.slug}`,
      image: l.image,
      addressLocality: l.locatie,
      addressRegion: region.name,
      priceRange: String(l.price || ''),
    })),
  });

  const faqs = getFaqs(region.slug, listingType.slug);
  const faqJsonLd = buildFaqJsonLd(pageUrl, faqs);

  const jsonLdScripts: Record<string, unknown>[] = [...listingJsonLd];
  if (faqJsonLd) jsonLdScripts.push(faqJsonLd);

  return (
    <>
      {jsonLdScripts.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
      <main className="min-h-screen px-4 lg:px-6 py-10">
        <header className="max-w-4xl mx-auto text-center">
          <nav aria-label="Breadcrumb" className="text-sm text-emerald-800/80">
            <Link href="/" className="hover:underline">Acasa</Link>
            <span className="mx-2">/</span>
            <Link href={`/cazari/${listingType.slug}`} className="hover:underline">{listingType.label}</Link>
            <span className="mx-2">/</span>
            <span>{region.name}</span>
          </nav>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">
            {region.name}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold mt-3">
            {listingType.label} in {region.name}
          </h1>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            {description}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/add-property"
              className="px-6 py-2.5 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 transition"
            >
              Inscrie proprietatea ta
            </Link>
            <Link
              href="/contact"
              className="px-6 py-2.5 rounded-full border border-emerald-300 text-emerald-900 hover:bg-emerald-100 transition"
            >
              Contacteaza-ne
            </Link>
          </div>
        </header>

        <section className="mt-12">
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 px-6 py-10 text-center">
              <div className="text-5xl mb-3">🏡</div>
              <h2 className="text-2xl font-semibold text-emerald-900 mb-2">
                Momentan nu avem {listingType.label.toLowerCase()} in {region.name}
              </h2>
              <p className="text-emerald-800/80 max-w-2xl mx-auto">
                Publicam treptat locatii reale, atent verificate. Revino in curand sau inscrie o proprietate daca stii una.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-2 gap-y-8">
              <ListingsGrid cazari={listings} />
            </div>
          )}
        </section>

        {faqs.length > 0 && (
          <section className="mt-16 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-6">
              Intrebari frecvente despre {listingType.label.toLowerCase()} in {region.name}
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details key={i} className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-900 border dark:border-zinc-800">
                  <summary className="font-semibold cursor-pointer">{faq.q}</summary>
                  <p className="mt-2 text-gray-700 dark:text-gray-300">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
