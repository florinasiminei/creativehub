import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ListingsGrid from "@/components/listing/ListingGrid";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import { countPublishedListingsByCounty } from "@/lib/seoListingsCounts";
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from "@/lib/jsonLd";
import { findCountyBySlug, getCounties } from "@/lib/counties";
import type { ListingRaw } from "@/lib/types";
import type { Cazare } from "@/lib/utils";

export const revalidate = 60 * 60 * 6;

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return getCounties().map((county) => ({ slug: county.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const county = findCountyBySlug(params.slug);
  if (!county) return {};
  const title = `Cazare in judetul ${county.name}`;
  const description = `Descopera cazari atent selectate in judetul ${county.name}, cu verificare foto/video si rezervare direct la gazda.`;
  const canonical = new URL(`/judet/${county.slug}`, siteUrl).toString();
  const supabaseAdmin = getSupabaseAdmin();
  const publishedListingsCount = await countPublishedListingsByCounty(supabaseAdmin, county.name);
  const shouldIndex = await resolveListingsRouteIndexability(
    `/judet/${county.slug}`,
    publishedListingsCount
  );

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

async function getCountyListings(countyName: string): Promise<Cazare[]> {
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
    .eq("judet", countyName)
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
      .eq("judet", countyName)
      .order("display_order", { foreignTable: "listing_images", ascending: true })
      .limit(1, { foreignTable: "listing_images" });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return (data as unknown as ListingRaw[]).map((row) => mapListingSummary(row));
}

export default async function CountyPage({ params }: PageProps) {
  const county = findCountyBySlug(params.slug);
  if (!county) return notFound();
  if (params.slug !== county.slug) {
    permanentRedirect(`/judet/${county.slug}`);
  }

  const listings = await getCountyListings(county.name);
  const pageUrl = `${siteUrl}/judet/${county.slug}`;
  const description = `Descopera cele mai frumoase cazari din judetul ${county.name}. Listari curate, verificate, cu contact direct la gazda.`;

  const listingJsonLd = buildListingPageJsonLd({
    siteUrl,
    pageUrl,
    typeLabel: "Cazare",
    typeSlug: "cazare",
    locationLabel: `Judetul ${county.name}`,
    locationSlug: county.slug,
    description,
    items: listings.map((l) => ({
      name: l.title,
      url: `${siteUrl}/cazare/${l.slug}`,
      image: l.image,
      addressLocality: l.locatie,
      addressRegion: county.name,
      priceRange: String(l.price || ""),
    })),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Acasa", item: siteUrl },
    { name: `Judet ${county.name}`, item: `${siteUrl}/judet/${county.slug}` },
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
            <span>{county.name}</span>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Judet</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Cazare in judetul {county.name}</h1>
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
                Momentan nu avem cazari publicate in judetul {county.name}
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
