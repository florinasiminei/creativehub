import { notFound } from "next/navigation";
import Link from "next/link";
import ListingsGrid from "@/components/listing/ListingGrid";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { hasMinimumPublishedListings } from "@/lib/seoIndexing";
import { findCountyBySlug, getCounties } from "@/lib/counties";
import { slugify } from "@/lib/utils";
import { allRegions, findRegionBySlug, normalizeRegionText } from "@/lib/regions";
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from "@/lib/jsonLd";
import type { ListingRaw } from "@/lib/types";
import type { Cazare } from "@/lib/utils";

export const revalidate = 60 * 60 * 6;

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: { slug: string };
};

function resolveRegionCountyNames(regionCounties: string[]): string[] {
  const counties = getCounties();
  const byKey = new Map(counties.map((county) => [normalizeRegionText(county.name), county.name] as const));
  const resolved = regionCounties
    .map((county) => {
      const byNormalized = byKey.get(normalizeRegionText(county));
      if (byNormalized) return byNormalized;
      const fuzzy = findCountyBySlug(slugify(String(county || "")));
      return fuzzy?.name || county;
    })
    .filter(Boolean);
  return Array.from(new Set(resolved));
}

export async function generateStaticParams() {
  return allRegions.map((region) => ({ slug: region.slug }));
}

async function getPublishedRegionListingsCount(region: {
  counties: string[];
  type: string;
  coreCities?: string[];
}): Promise<number> {
  const countyNames = resolveRegionCountyNames(region.counties);
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("city")
    .eq("is_published", true)
    .in("judet", countyNames);

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
  const region = findRegionBySlug(params.slug);
  if (!region) return {};
  const title = `Cazare in ${region.name}`;
  const description =
    region.type === "metro"
      ? `Descopera cazari in ${region.name}, cu verificare foto/video si rezervare direct la gazda.`
      : `Descopera cazare atent selectata in ${region.name}, cu verificare foto/video si rezervare direct la gazda.`;
  const canonical = new URL(`/regiune/${region.slug}`, siteUrl).toString();
  const publishedListingsCount = await getPublishedRegionListingsCount(region);
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


async function getRegionListings(region: { counties: string[]; type: string; coreCities?: string[] }): Promise<Cazare[]> {
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

  const withOrder = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .eq("is_published", true)
    .in("judet", countyNames)
    .order("display_order", { ascending: false, nullsFirst: false })
    .order("display_order", { foreignTable: "listing_images", ascending: true })
    .limit(1, { foreignTable: "listing_images" });

  let data = withOrder.data;
  let error = withOrder.error;

  if (error && String(error.message || "").includes("display_order")) {
    const fallback = await supabaseAdmin
      .from("listings")
      .select(baseSelect)
      .eq("is_published", true)
      .in("judet", countyNames)
      .order("display_order", { foreignTable: "listing_images", ascending: true })
      .limit(1, { foreignTable: "listing_images" });
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

export default async function RegionPage({ params }: PageProps) {
  const region = findRegionBySlug(params.slug);
  if (!region) return notFound();

  const listings = await getRegionListings(region);
  const pageUrl = `${siteUrl}/regiune/${region.slug}`;
  const description = `Descopera cele mai frumoase cazari din ${region.name}. Listari curate, verificate, cu contact direct la gazda.`;

  const listingJsonLd = buildListingPageJsonLd({
    siteUrl,
    pageUrl,
    typeLabel: "Cazare",
    typeSlug: "cazare",
    locationLabel: region.name,
    locationSlug: region.slug,
    description,
    items: listings.map((l) => ({
      name: l.title,
      url: `${siteUrl}/cazare/${l.slug}`,
      image: l.image,
      addressLocality: l.locatie,
      addressRegion: region.name,
      priceRange: String(l.price || ""),
    })),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", item: siteUrl },
    { name: `Regiune ${region.name}`, item: pageUrl },
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
      <main className="min-h-screen px-4 py-10 lg:px-6">
        <header className="mx-auto max-w-4xl text-center">
          <nav aria-label="Breadcrumb" className="text-sm text-emerald-800/80">
            <Link href="/" className="hover:underline">
              Acasa
            </Link>
            <span className="mx-2">/</span>
            <span>{region.name}</span>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            {region.type === "metro" ? "Localitate" : "Regiune"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Cazare in {region.name}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">{description}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/add-property"
              className="rounded-full bg-emerald-700 px-6 py-2.5 text-white transition hover:bg-emerald-800"
            >
              Inscrie proprietatea ta
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-emerald-300 px-6 py-2.5 text-emerald-900 transition hover:bg-emerald-100"
            >
              Contacteaza-ne
            </Link>
          </div>
        </header>

        <section className="mt-12">
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 px-6 py-10 text-center">
              <h2 className="mb-2 text-2xl font-semibold text-emerald-900">
                Momentan nu avem cazari publicate in {region.name}
              </h2>
              <p className="mx-auto max-w-2xl text-emerald-800/80">
                Publicam treptat locatii reale, atent verificate. Revino in curand sau inscrie o proprietate.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-2 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <ListingsGrid cazari={listings} />
            </div>
          )}
        </section>
      </main>
    </>
  );
}
