import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { LISTING_TYPES } from "@/lib/listingTypes";

export const revalidate = 60 * 60 * 12;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cabn.ro";
  const lastModified = new Date();

  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from("listings")
    .select("slug, updated_at, created_at")
    .eq("is_published", true);

  const listingEntries: MetadataRoute.Sitemap = (data || []).flatMap((row: any) => {
    if (!row?.slug) return [];
    const modified = row.updated_at || row.created_at || lastModified;
    return [
      {
        url: `${siteUrl}/cazare/${row.slug}`,
        lastModified: new Date(modified),
        changeFrequency: "weekly",
        priority: 0.8,
      },
    ];
  });

  const listingTypeEntries: MetadataRoute.Sitemap = LISTING_TYPES.map((type) => ({
    url: `${siteUrl}/cazari/${type.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    ...listingTypeEntries,
    {
      url: `${siteUrl}/descoperaCABN`,
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
    ...listingEntries,
  ];
}
