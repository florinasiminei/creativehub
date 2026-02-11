import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import HomeClient from "@/app/home-client";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { sortFacilitiesByPriority } from "@/lib/facilitiesCatalog";
import { getCanonicalSiteUrl } from "@/lib/siteUrl";
import { hasMinimumPublishedListings } from "@/lib/seoIndexing";
import { buildBreadcrumbJsonLd, buildListingPageJsonLd } from "@/lib/jsonLd";
import { findCountyBySlug, getCounties } from "@/lib/counties";
import type { ListingRaw } from "@/lib/types";
import type { Cazare } from "@/lib/utils";
import type { FacilityOption } from "@/lib/types";

export const revalidate = 60 * 60 * 6;

const siteUrl = getCanonicalSiteUrl();

type PageProps = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return getCounties().map((county) => ({ slug: county.slug }));
}

async function getPublishedCountyListingsCount(countyName: string): Promise<number> {
  const supabaseAdmin = getSupabaseAdmin();
  const { count, error } = await supabaseAdmin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .eq("judet", countyName);

  if (error) return Number.POSITIVE_INFINITY;
  return Number(count || 0);
}

export async function generateMetadata({ params }: PageProps) {
  const county = findCountyBySlug(params.slug);
  if (!county) return {};
  const title = `Cazare in judetul ${county.name}`;
  const description = `Descopera cazari atent selectate in judetul ${county.name}, cu verificare foto/video si rezervare direct la gazda.`;
  const canonical = new URL(`/judet/${county.slug}`, siteUrl).toString();
  const publishedListingsCount = await getPublishedCountyListingsCount(county.name);
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
  const supabaseAdmin = getSupabaseAdmin();
  const { data: facilities } = await supabaseAdmin.from("facilities").select("id, name");
  const sortedFacilities = sortFacilitiesByPriority((facilities || []) as FacilityOption[]);
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
      <Suspense
        fallback={<div className="flex min-h-[60vh] items-center justify-center">Se incarca...</div>}
      >
        <HomeClient
          initialCazari={listings}
          initialFacilities={sortedFacilities}
          pageTitle={`Cazare in judetul ${county.name}`}
          allowClientBootstrapFetch={false}
        />
      </Suspense>
    </>
  );
}
