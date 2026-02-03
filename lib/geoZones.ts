import { slugify } from "@/lib/utils";

type GeoZoneSyncInput = {
  listingId: string;
  judet?: string | null;
  replace?: boolean;
};

type SupabaseLike = {
  from: (table: string) => any;
};

async function findJudetGeoZoneId(
  supabaseAdmin: SupabaseLike,
  name: string
) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: byName } = await supabaseAdmin
    .from("geo_zones")
    .select("id")
    .eq("type", "judet")
    .ilike("name", trimmed)
    .limit(1);

  if (byName?.[0]?.id) return byName[0].id;

  const baseSlug = slugify(trimmed);
  const slugCandidates = [`judet-${baseSlug}`, baseSlug];

  const { data: bySlug } = await supabaseAdmin
    .from("geo_zones")
    .select("id")
    .eq("type", "judet")
    .in("slug", slugCandidates)
    .limit(1);

  return bySlug?.[0]?.id ?? null;
}

export async function syncListingGeoZones(
  supabaseAdmin: SupabaseLike,
  { listingId, judet, replace = false }: GeoZoneSyncInput
) {
  const manageJudet = judet !== undefined;
  const hasJudet = typeof judet === "string" && judet.trim().length > 0;
  if (!listingId || !manageJudet) return;

  try {
    if (replace) {
      const { data: zoneIds } = await supabaseAdmin
        .from("geo_zones")
        .select("id")
        .eq("type", "judet");
      const ids = (zoneIds || []).map((z: any) => z.id).filter(Boolean);
      if (ids.length > 0) {
        await supabaseAdmin
          .from("listing_geo_zone")
          .delete()
          .eq("listing_id", listingId)
          .in("geo_zone_id", ids);
      }
    }

    const rels: Array<{
      listing_id: string;
      geo_zone_id: string;
      is_primary: boolean;
    }> = [];

    if (hasJudet) {
      const id = await findJudetGeoZoneId(supabaseAdmin, judet!.trim());
      if (id) rels.push({ listing_id: listingId, geo_zone_id: id, is_primary: true });
    }

    if (rels.length > 0) {
      await supabaseAdmin
        .from("listing_geo_zone")
        .upsert(rels, { onConflict: "listing_id,geo_zone_id" });
    }
  } catch {
    // ignore if geo_zones or listing_geo_zone does not exist yet
  }
}
