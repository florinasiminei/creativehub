import { notFound } from "next/navigation";
import { Suspense } from "react";
import HomeClient from "@/app/home-client";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { sortFacilitiesByPriority } from "@/lib/facilitiesCatalog";
import { buildListingPageJsonLd } from "@/lib/jsonLd";
import { findCountyBySlug, getCounties } from "@/lib/counties";
import type { ListingRaw } from "@/lib/types";
import type { Cazare } from "@/lib/utils";
import type { FacilityOption } from "@/lib/types";

export const revalidate = 60 * 60 * 12;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";

type PageProps = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return getCounties().map((county) => ({ slug: county.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const county = findCountyBySlug(params.slug);
  if (!county) return {};
  const title = `Cazare in judetul ${county.name} | CABN.ro`;
  const description = `Descopera cazari atent selectate in judetul ${county.name}, cu verificare foto/video si rezervare direct la gazda.`;
  const canonical = `/judet/${county.slug}`;
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

  const listings = await getCountyListings(county.name);
  const supabaseAdmin = getSupabaseAdmin();
  const { data: facilities } = await supabaseAdmin.from("facilities").select("id, name");
  const sortedFacilities = sortFacilitiesByPriority((facilities || []) as FacilityOption[]);
  const pageUrl = `${siteUrl}/judet/${county.slug}`;
  const description = `Descopera cele mai frumoase cazari din judetul ${county.name}. Listari curate, verificate, cu contact direct la gazda.`;

  const jsonLd = buildListingPageJsonLd({
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

  return (
    <>
      {jsonLd.map((obj, i) => (
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
        />
      </Suspense>
    </>
  );
}
