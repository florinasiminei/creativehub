import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { LISTING_TYPES } from "@/lib/listingTypes";
import { allRegions, touristRegions } from "@/lib/regions";
import { getCounties } from "@/lib/counties";

export const revalidate = 60 * 60 * 12;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";
  const siteUrl = rawUrl;
  const lastModified = new Date();
  const safeDate = (value: unknown) => {
    const candidate = value ? new Date(String(value)) : null;
    if (candidate && !Number.isNaN(candidate.getTime())) return candidate;
    return lastModified;
  };

  let listingEntries: MetadataRoute.Sitemap = [];
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data } = await supabaseAdmin
      .from("listings")
      .select("slug, updated_at, created_at")
      .eq("is_published", true);

    listingEntries = (data || []).flatMap((row: any) => {
      if (!row?.slug) return [];
      return [
        {
          url: `${siteUrl}/cazare/${row.slug}`,
          lastModified: safeDate(row.updated_at || row.created_at),
          changeFrequency: "weekly",
          priority: 0.8,
        },
      ];
    });
  } catch {
    // Keep sitemap available even if the listings query fails.
    listingEntries = [];
  }

  const listingTypeEntries: MetadataRoute.Sitemap = LISTING_TYPES.map((type) => ({
    url: `${siteUrl}/cazari/${type.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const regionEntries: MetadataRoute.Sitemap = allRegions.map((region) => ({
    url: `${siteUrl}/regiune/${region.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const countyEntries: MetadataRoute.Sitemap = getCounties().map((county) => ({
    url: `${siteUrl}/judet/${county.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const typeRegionEntries: MetadataRoute.Sitemap = LISTING_TYPES.flatMap((type) =>
    touristRegions.map((region) => ({
      url: `${siteUrl}/cazari/${type.slug}/${region.slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    }))
  );

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    ...listingTypeEntries,
    {
      url: `${siteUrl}/about-us`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/servicii`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/politica-confidentialitate`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${siteUrl}/politica-cookie`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    ...regionEntries,
    ...countyEntries,
    ...typeRegionEntries,
    ...listingEntries,
  ];
}
