import Link from 'next/link';
import { notFound } from 'next/navigation';
import ListingsGrid from '@/components/listing/ListingGrid';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { mapListingSummary } from '@/lib/transformers';
import { getTypeBySlug, LISTING_TYPES } from '@/lib/listingTypes';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from '@/lib/jsonLd';
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

async function typeHasListings(typeValue: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();
  const { count, error } = await supabaseAdmin
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('type', typeValue);

  if (error) return true;
  return Number(count || 0) > 0;
}

export async function generateMetadata({ params }: PageProps) {
  const listingType = getTypeBySlug(params.type);
  if (!listingType) return {};

  const curatedMetadata: Record<string, { title: string; description: string }> = {
    cabane: {
      title: "Cabane de inchiriat in Romania",
      description:
        "Gaseste cabane potrivite pentru weekend sau vacanta, cu informatii clare despre capacitate, pret si locatie, plus contact direct la gazda.",
    },
    pensiuni: {
      title: "Pensiuni in Romania pentru sejururi relaxate",
      description:
        "Descopera pensiuni verificate unde poti compara rapid facilitatile, zona si pretul, apoi rezervi direct cu proprietarul.",
    },
  };

  const curated = curatedMetadata[listingType.slug];
  const title = curated?.title ?? `${listingType.label} in Romania`;
  const description =
    curated?.description ??
    `Descopera ${listingType.label.toLowerCase()} atent selectate, cu verificare foto/video si rezervare direct la gazda.`;
  const canonical = new URL(`/cazari/${listingType.slug}`, siteUrl).toString();
  const hasListings = await typeHasListings(listingType.value);
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
    robots: hasListings ? undefined : { index: false, follow: true },
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

export default async function TypePage({ params }: PageProps) {
  const listingType = getTypeBySlug(params.type);
  if (!listingType) return notFound();

  const listings = await getTypeListings(listingType.value);
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
      </main>
    </>
  );
}
