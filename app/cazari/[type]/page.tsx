import Link from 'next/link';
import { notFound } from 'next/navigation';
import ListingsGrid from '@/components/listing/ListingGrid';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { mapListingSummary } from '@/lib/transformers';
import { getTypeBySlug, LISTING_TYPES } from '@/lib/listingTypes';
import { getCounties } from '@/lib/counties';
import { normalizeRegionText } from '@/lib/regions';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';
import { resolveListingsRouteIndexability } from '@/lib/seoRouteIndexing';
import { countPublishedListingsByType } from '@/lib/seoListingsCounts';
import { buildSeoTypeDescription, buildSeoTypeTitle, getSeoTypeLabel } from '@/lib/seoCopy';
import { buildSocialMetadata } from '@/lib/seoMetadata';
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from '@/lib/jsonLd';
import { buildTypeCountyPath } from '@/lib/typeCountyRoutes';
import type { ListingRaw } from '@/lib/types';
import type { Cazare } from '@/lib/utils';

export const revalidate = 60 * 60 * 6;

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: { type: string };
};

export async function generateStaticParams() {
  return LISTING_TYPES.map((type) => ({ type: type.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const listingType = getTypeBySlug(params.type);
  if (!listingType) return {};
  const seoTypeLabel = getSeoTypeLabel(listingType.slug, listingType.label);
  const title = buildSeoTypeTitle(seoTypeLabel, "în România");
  const description = buildSeoTypeDescription(seoTypeLabel, "în România");
  const canonical = new URL(`/cazari/${listingType.slug}`, siteUrl).toString();
  const supabaseAdmin = getSupabaseAdmin();
  const publishedListingsCount = await countPublishedListingsByType(supabaseAdmin, listingType.value);
  const shouldIndex = await resolveListingsRouteIndexability(
    `/cazari/${listingType.slug}`,
    publishedListingsCount
  );
  return {
    title,
    description,
    alternates: {
      canonical,
    },
    ...buildSocialMetadata({
      title,
      description,
      canonicalUrl: canonical,
    }),
    robots: shouldIndex ? undefined : { index: false, follow: true },
  };
}


async function getTypeListings(typeValue: string): Promise<Cazare[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const baseSelect = `
    id, title, slug, type, judet, city, sat, capacity, price, phone, is_published, display_order,
    camere, paturi, bai,
    listing_images(image_url, display_order),
    listing_facilities(
      facilities(id, name)
    )
  `;

  const withOrder = await supabaseAdmin
    .from('listings')
    .select(baseSelect)
    .eq('is_published', true)
    .eq('type', typeValue)
    .order('display_order', { ascending: false, nullsFirst: false })
    .order('display_order', { foreignTable: 'listing_images', ascending: true })
    .limit(1, { foreignTable: 'listing_images' });

  let data = withOrder.data;
  let error = withOrder.error;

  if (error && String(error.message || '').includes('display_order')) {
    const fallback = await supabaseAdmin
      .from('listings')
      .select(baseSelect)
      .eq('is_published', true)
      .eq('type', typeValue)
      .order('display_order', { foreignTable: 'listing_images', ascending: true })
      .limit(1, { foreignTable: 'listing_images' });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return (data as unknown as ListingRaw[]).map((row) => mapListingSummary(row));
}

type CountyLinkItem = {
  countyName: string;
  countySlug: string;
  href: string;
  countyHref: string;
  count: number;
};

async function getTypeCountyLinks(typeSlug: string, typeValue: string): Promise<CountyLinkItem[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("judet")
    .eq("is_published", true)
    .eq("type", typeValue);

  if (error || !data) return [];

  const counties = getCounties();
  const countyByKey = new Map(
    counties.map((county) => [normalizeRegionText(county.name), county] as const)
  );
  const countsBySlug = new Map<string, number>();

  for (const row of data as Array<Record<string, unknown>>) {
    const key = normalizeRegionText(String(row["judet"] || ""));
    const county = countyByKey.get(key);
    if (!county) continue;
    countsBySlug.set(county.slug, (countsBySlug.get(county.slug) || 0) + 1);
  }

  return counties
    .map((county) => ({
      countyName: county.name,
      countySlug: county.slug,
      href: buildTypeCountyPath(typeSlug, county.slug),
      countyHref: `/judet/${county.slug}`,
      count: countsBySlug.get(county.slug) || 0,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => (b.count - a.count) || a.countyName.localeCompare(b.countyName, "ro"))
    .slice(0, 12);
}

export default async function TypePage({ params }: PageProps) {
  const listingType = getTypeBySlug(params.type);
  if (!listingType) return notFound();

  const [listings, countyLinks] = await Promise.all([
    getTypeListings(listingType.value),
    getTypeCountyLinks(listingType.slug, listingType.value),
  ]);
  const pageUrl = `${siteUrl}/cazari/${listingType.slug}`;
  const description = `Listari curate, cu verificare vizuala si contact direct la gazda. Gaseste cele mai frumoase ${listingType.label.toLowerCase()} din Romania.`;

  const listingJsonLd = buildListingPageJsonLd({
    siteUrl,
    pageUrl,
    typeLabel: listingType.label,
    typeSlug: listingType.slug,
    description,
    items: listings.map((l) => ({
      name: l.title,
      url: `${siteUrl}/cazare/${l.slug}`,
      image: l.image,
      addressLocality: l.locatie,
      addressRegion: 'Romania',
      priceRange: String(l.price || ''),
    })),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", item: siteUrl },
    { name: listingType.label, item: `${siteUrl}/cazari/${listingType.slug}` },
  ]);
  const jsonLdScripts: Record<string, unknown>[] = [
    breadcrumbJsonLd,
    ...listingJsonLd.filter((obj) => (obj as any)?.["@type"] !== "BreadcrumbList"),
  ];

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
            <span>{listingType.label}</span>
          </nav>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">
            cabn.ro
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold mt-3">
            {listingType.label} verificate
          </h1>
          <p className="text-gray-600 mt-3">{description}</p>
          <p className="text-gray-600/90 mt-2 max-w-2xl mx-auto">
            Rezultatele includ proprietati publicate cu date esentiale pentru comparatie rapida.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/servicii"
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

        <section className="mt-10">
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 px-6 py-10 text-center">
              <div className="text-5xl mb-3">🏡</div>
              <h2 className="text-2xl font-semibold text-emerald-900 mb-2">
                Momentan nu avem {listingType.label.toLowerCase()} publicate
              </h2>
              <p className="text-emerald-800/80 max-w-2xl mx-auto">
                Publicam treptat locatii reale, atent verificate. Revino in curand sau inscrie o proprietate.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-2 gap-y-8">
              <ListingsGrid cazari={listings} />
            </div>
          )}
        </section>

        {countyLinks.length > 0 && (
          <section className="mt-12 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-emerald-900">
              Cazari populare pe judete
            </h2>
            <p className="mt-2 text-sm text-emerald-800/80">
              Selecteaza un judet ca sa vezi rapid cele mai potrivite rezultate pentru {listingType.label.toLowerCase()}.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {countyLinks.map((item) => (
                <article
                  key={item.countySlug}
                  className="rounded-2xl border border-emerald-200/70 bg-white/90 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-emerald-950">{item.countyName}</h3>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      {item.count}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={item.href}
                      className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Vezi in judet
                    </Link>
                    <Link
                      href={item.countyHref}
                      className="inline-flex items-center justify-center rounded-full border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                    >
                      Pagina judetului
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
