import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ListingsGrid from "@/components/listing/ListingGrid";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { getTypeBySlug, LISTING_TYPES } from "@/lib/listingTypes";
import { getCounties } from "@/lib/counties";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { resolveListingsRouteIndexability } from "@/lib/seoRouteIndexing";
import {
  countPublishedListingsByTypeAndCounty,
  countPublishedListingsByTypeAndRegion,
  resolveRegionCountyNames,
} from "@/lib/seoListingsCounts";
import { buildSeoTypeDescription, buildSeoTypeTitle, getSeoTypeLabel } from "@/lib/seoCopy";
import { buildSocialMetadata } from "@/lib/seoMetadata";
import { allRegions, normalizeRegionText } from "@/lib/regions";
import { buildListingPageJsonLd } from "@/lib/jsonLd";
import {
  buildCountySegment,
  buildRegionSegment,
  buildTypeLocationPath,
  parseListingLocationSegment,
} from "@/lib/locationRoutes";
import type { ListingRaw } from "@/lib/types";
import type { Cazare } from "@/lib/utils";

export const revalidate = 60 * 60 * 6;

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: {
    type: string;
    location: string;
  };
};

type RegionInput = {
  counties: string[];
  type: string;
  coreCities?: string[];
};

const baseSelect = `
  id, title, slug, type, judet, city, sat, capacity, price, phone, is_published, display_order,
  camere, paturi, bai,
  listing_images(image_url, display_order),
  listing_facilities(
    facilities(id, name)
  )
`;

function getLocationLabel(location: NonNullable<ReturnType<typeof parseListingLocationSegment>>): string {
  if (location.kind === "judet" && location.county) return `județul ${location.county.name}`;
  if (location.region) return location.region.name;
  return "";
}

function getLocationTitle(
  typeSlug: string,
  typeLabel: string,
  location: NonNullable<ReturnType<typeof parseListingLocationSegment>>
): string {
  const seoTypeLabel = getSeoTypeLabel(typeSlug, typeLabel);
  return buildSeoTypeTitle(seoTypeLabel, `în ${getLocationLabel(location)}`);
}

function getLocationDescription(
  typeSlug: string,
  typeLabel: string,
  location: NonNullable<ReturnType<typeof parseListingLocationSegment>>
): string {
  const seoTypeLabel = getSeoTypeLabel(typeSlug, typeLabel);
  if (location.kind === "judet" && location.county) {
    return buildSeoTypeDescription(seoTypeLabel, `în județul ${location.county.name}`);
  }
  if (location.kind === "localitate" && location.region) {
    return buildSeoTypeDescription(seoTypeLabel, `în ${location.region.name}`);
  }
  if (location.region) {
    return buildSeoTypeDescription(seoTypeLabel, `în ${location.region.name}`);
  }
  return buildSeoTypeDescription(seoTypeLabel, "în România");
}

function getLocationBadge(location: NonNullable<ReturnType<typeof parseListingLocationSegment>>): string {
  if (location.kind === "judet") return "Judet";
  if (location.kind === "localitate") return "Localitate";
  return "Regiune";
}

function getLocationMetaLabel(location: NonNullable<ReturnType<typeof parseListingLocationSegment>>): string {
  if (location.kind === "judet" && location.county) return `Județul ${location.county.name}`;
  if (location.region) return location.region.name;
  return "Romania";
}

export async function generateStaticParams() {
  const params: Array<{ type: string; location: string }> = [];
  for (const type of LISTING_TYPES) {
    for (const county of getCounties()) {
      params.push({ type: type.slug, location: buildCountySegment(county.slug) });
    }
    for (const region of allRegions) {
      params.push({ type: type.slug, location: buildRegionSegment(region) });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageProps) {
  const listingType = getTypeBySlug(params.type);
  const location = parseListingLocationSegment(params.location);
  if (!listingType || !location) return {};

  const canonicalPath = buildTypeLocationPath(listingType.slug, location.canonicalSegment);
  const canonical = new URL(canonicalPath, siteUrl).toString();
  const title = getLocationTitle(listingType.slug, listingType.label, location);
  const description = getLocationDescription(listingType.slug, listingType.label, location);

  const supabaseAdmin = getSupabaseAdmin();
  const publishedListingsCount =
    location.kind === "judet" && location.county
      ? await countPublishedListingsByTypeAndCounty(supabaseAdmin, listingType.value, location.county.name)
      : location.region
      ? await countPublishedListingsByTypeAndRegion(supabaseAdmin, listingType.value, location.region)
      : 0;
  const shouldIndex = await resolveListingsRouteIndexability(canonicalPath, publishedListingsCount);

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

async function getTypeCountyListings(typeValue: string, countyName: string): Promise<Cazare[]> {
  const supabaseAdmin = getSupabaseAdmin();

  const withOrder = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .eq("is_published", true)
    .eq("type", typeValue)
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
      .eq("type", typeValue)
      .eq("judet", countyName)
      .order("display_order", { foreignTable: "listing_images", ascending: true })
      .limit(1, { foreignTable: "listing_images" });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return ((data as unknown as ListingRaw[]) || []).map((row) => mapListingSummary(row));
}

async function getTypeRegionListings(typeValue: string, region: RegionInput): Promise<Cazare[]> {
  const countyNames = resolveRegionCountyNames(region.counties);
  const supabaseAdmin = getSupabaseAdmin();

  const withOrder = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .eq("is_published", true)
    .eq("type", typeValue)
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
      .eq("type", typeValue)
      .in("judet", countyNames)
      .order("display_order", { foreignTable: "listing_images", ascending: true })
      .limit(1, { foreignTable: "listing_images" });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  const rows = (data as unknown as ListingRaw[]) || [];
  const normalizedMetroCities = region.coreCities
    ? new Set(region.coreCities.map((city) => normalizeRegionText(city)))
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
  const location = parseListingLocationSegment(params.location);

  if (!listingType || !location) return notFound();

  const canonicalPath = buildTypeLocationPath(listingType.slug, location.canonicalSegment);
  if (params.location !== location.canonicalSegment) {
    permanentRedirect(canonicalPath);
  }

  const listings =
    location.kind === "judet" && location.county
      ? await getTypeCountyListings(listingType.value, location.county.name)
      : location.region
      ? await getTypeRegionListings(listingType.value, location.region)
      : [];

  const pageUrl = `${siteUrl}${canonicalPath}`;
  const locationName = getLocationMetaLabel(location);
  const title = getLocationTitle(listingType.slug, listingType.label, location);
  const description = getLocationDescription(listingType.slug, listingType.label, location);

  const listingJsonLd = buildListingPageJsonLd({
    siteUrl,
    pageUrl,
    typeLabel: listingType.label,
    typeSlug: listingType.slug,
    locationLabel: locationName,
    locationSlug:
      location.kind === "judet" && location.county
        ? location.county.slug
        : location.region
        ? location.region.slug
        : "",
    description,
    items: listings.map((listing) => ({
      name: listing.title,
      url: `${siteUrl}/cazare/${listing.slug}`,
      image: listing.image,
      addressLocality: listing.locatie,
      addressRegion: locationName,
      priceRange: String(listing.price || ""),
    })),
  });

  return (
    <>
      {listingJsonLd.map((obj, index) => (
        <script
          key={index}
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
            <Link href={`/cazari/${listingType.slug}`} className="hover:underline">
              {listingType.label}
            </Link>
            <span className="mx-2">/</span>
            <span>{locationName}</span>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            {getLocationBadge(location)}
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">{description}</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-emerald-900/80">
            Rezultatele din aceasta pagina sunt organizate pe ierarhia noua de locatie pentru a evita ambiguitatea intre judet, localitate si regiune.
          </p>
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
                Momentan nu avem {listingType.label.toLowerCase()} in {locationName}
              </h2>
              <p className="mx-auto max-w-2xl text-emerald-800/80">
                Publicam treptat locatii reale, atent verificate. Revino in curand sau inscrie o proprietate daca stii una.
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
