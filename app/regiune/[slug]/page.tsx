import Link from "next/link";
import { notFound } from "next/navigation";
import ListingsGrid from "@/components/listing/ListingGrid";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import {
  allRegions,
  findRegionBySlug,
  metroCoreCitySet,
  normalizeRegionText,
} from "@/lib/regions";
import { buildListingPageJsonLd } from "@/lib/jsonLd";
import type { ListingRaw } from "@/lib/types";
import type { Cazare } from "@/lib/utils";

export const revalidate = 60 * 60 * 12;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";

type PageProps = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return allRegions.map((region) => ({ slug: region.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const region = findRegionBySlug(params.slug);
  if (!region) return {};
  const title =
    region.type === "metro"
      ? `Cazare in ${region.name} | CABN.ro`
      : `Cazare in ${region.name} | CABN.ro`;
  const description =
    region.type === "metro"
      ? `Descopera cazari in ${region.name}, cu verificare foto/video si rezervare direct la gazda.`
      : `Descopera cazare atent selectata in ${region.name}, cu verificare foto/video si rezervare direct la gazda.`;
  const canonical = `/regiune/${region.slug}`;
  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}${canonical}`,
    },
  };
}


async function getRegionListings(region: { counties: string[]; type: string; coreCities?: string[] }): Promise<Cazare[]> {
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
    .in("judet", region.counties)
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
      .in("judet", region.counties)
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

  const filtered = rows.filter((row) => {
    const cityNorm = normalizeRegionText(String((row as any).city || ""));
    if (region.type === "metro") {
      return normalizedMetroCities ? normalizedMetroCities.has(cityNorm) : false;
    }
    if (!cityNorm) return true;
    return !metroCoreCitySet.has(cityNorm);
  });

  return filtered.map((row) => mapListingSummary(row));
}

export default async function RegionPage({ params }: PageProps) {
  const region = findRegionBySlug(params.slug);
  if (!region) return notFound();

  const listings = await getRegionListings(region);
  const pageUrl = `${siteUrl}/regiune/${region.slug}`;
  const description = `Descopera cele mai frumoase cazari din ${region.name}. Listari curate, verificate, cu contact direct la gazda.`;

  const jsonLd = buildListingPageJsonLd({
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

  return (
    <>
      {jsonLd.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
      <main className="min-h-screen px-4 lg:px-6 py-10">
        <header className="max-w-4xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">
            {region.name}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold mt-3">
            Cazare in {region.name}
          </h1>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">{description}</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/descoperaCABN#contact"
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
                Momentan nu avem cazari in {region.name}
              </h2>
              <p className="text-emerald-800/80 max-w-2xl mx-auto">
                Publicam treptat locatii reale, atent verificate. Revino in curand sau inscrie o proprietate daca stii una.
              </p>
            </div>
          ) : (
            <ListingsGrid cazari={listings} />
          )}
        </section>
      </main>
    </>
  );
}
