import { getCounties } from "./counties";
import { LISTING_TYPES, type ListingTypeValue } from "./listingTypes";
import { normalizeRegionText } from "./regions";
import { slugify } from "./utils";

type FacilityBase = {
  id: string;
  name: string;
};

export type SeoFacility = FacilityBase & {
  slug: string;
};

export type TypeFacilityCountyCombo = {
  typeValue: string;
  typeSlug: string;
  typeLabel: string;
  facilityId: string;
  facilityName: string;
  facilitySlug: string;
  countyName: string;
  countySlug: string;
  listingIds: string[];
};

type ListingFacilityRawRow = Record<string, unknown>;

const LISTING_TYPE_VALUES = new Set<ListingTypeValue>(
  LISTING_TYPES.map((type) => type.value)
);

function toListingTypeValue(value: string): ListingTypeValue | null {
  const normalized = String(value || "").trim().toLowerCase();
  return LISTING_TYPE_VALUES.has(normalized as ListingTypeValue)
    ? (normalized as ListingTypeValue)
    : null;
}

function firstObject(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function makeUniqueFacilitySlugMap(facilities: FacilityBase[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const facility of facilities) {
    const base = slugify(facility.name || "") || facility.id.slice(0, 8);
    counts.set(base, (counts.get(base) || 0) + 1);
  }

  const result = new Map<string, string>();
  for (const facility of facilities) {
    const base = slugify(facility.name || "") || facility.id.slice(0, 8);
    const duplicateCount = counts.get(base) || 0;
    const slug = duplicateCount > 1 ? `${base}-${facility.id.slice(0, 8)}` : base;
    result.set(facility.id, slug);
  }

  return result;
}

export function toSeoFacilities(facilities: FacilityBase[]): SeoFacility[] {
  const byId = new Map<string, FacilityBase>();
  for (const facility of facilities) {
    const id = String(facility.id || "").trim();
    const name = String(facility.name || "").trim();
    if (!id || !name) continue;
    byId.set(id, { id, name });
  }

  const deduped = Array.from(byId.values());
  const slugMap = makeUniqueFacilitySlugMap(deduped);

  return deduped
    .map((facility) => ({
      ...facility,
      slug: slugMap.get(facility.id) || slugify(facility.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ro"));
}

export function findSeoFacilityBySlug(facilities: SeoFacility[], slug: string): SeoFacility | null {
  const normalized = slugify(String(slug || "").trim());
  if (!normalized) return null;
  return facilities.find((facility) => facility.slug === normalized) || null;
}

export async function fetchTypeFacilityCountyCombos(
  supabaseAdmin: any,
  options?: { publishedOnly?: boolean }
): Promise<TypeFacilityCountyCombo[]> {
  const { data, error } = await supabaseAdmin
    .from("listing_facilities")
    .select("listing_id, facilities(id, name), listings(id, type, judet, is_published)");

  if (error || !data) return [];

  const publishedOnly = Boolean(options?.publishedOnly);
  const countyByNormalizedName = new Map(
    getCounties().map((county) => [normalizeRegionText(county.name), county] as const)
  );
  const typeByValue = new Map(LISTING_TYPES.map((type) => [type.value, type] as const));

  const facilitiesForSlug: FacilityBase[] = [];
  const { data: facilitiesData, error: facilitiesError } = await supabaseAdmin
    .from("facilities")
    .select("id, name");

  if (!facilitiesError && Array.isArray(facilitiesData)) {
    for (const item of facilitiesData as Array<Record<string, unknown>>) {
      const facilityId = String(item["id"] || "").trim();
      const facilityName = String(item["name"] || "").trim();
      if (!facilityId || !facilityName) continue;
      facilitiesForSlug.push({ id: facilityId, name: facilityName });
    }
  } else {
    for (const row of data as ListingFacilityRawRow[]) {
      const facilityRow = firstObject(row["facilities"]);
      if (!facilityRow) continue;
      const facilityId = String(facilityRow["id"] || "").trim();
      const facilityName = String(facilityRow["name"] || "").trim();
      if (!facilityId || !facilityName) continue;
      facilitiesForSlug.push({ id: facilityId, name: facilityName });
    }
  }

  const seoFacilities = toSeoFacilities(facilitiesForSlug);
  const seoFacilityById = new Map(seoFacilities.map((facility) => [facility.id, facility]));

  const comboMap = new Map<
    string,
    Omit<TypeFacilityCountyCombo, "listingIds"> & { listingIds: Set<string> }
  >();

  for (const row of data as ListingFacilityRawRow[]) {
    const listingRow = firstObject(row["listings"]);
    const facilityRow = firstObject(row["facilities"]);
    if (!listingRow || !facilityRow) continue;

    const listingId = String(listingRow["id"] || row["listing_id"] || "").trim();
    if (!listingId) continue;

    const isPublished = Boolean(listingRow["is_published"]);
    if (publishedOnly && !isPublished) continue;

    const typeValue = toListingTypeValue(String(listingRow["type"] || ""));
    if (!typeValue) continue;

    const listingType = typeByValue.get(typeValue);
    if (!listingType) continue;

    const countyName = String(listingRow["judet"] || "").trim();
    const county = countyByNormalizedName.get(normalizeRegionText(countyName));
    if (!county) continue;

    const facilityId = String(facilityRow["id"] || "").trim();
    const seoFacility = seoFacilityById.get(facilityId);
    if (!seoFacility) continue;

    const key = `${listingType.slug}|${seoFacility.slug}|${county.slug}`;
    const existing = comboMap.get(key);
    if (existing) {
      existing.listingIds.add(listingId);
      continue;
    }

    comboMap.set(key, {
      typeValue: listingType.value,
      typeSlug: listingType.slug,
      typeLabel: listingType.label,
      facilityId: seoFacility.id,
      facilityName: seoFacility.name,
      facilitySlug: seoFacility.slug,
      countyName: county.name,
      countySlug: county.slug,
      listingIds: new Set([listingId]),
    });
  }

  return Array.from(comboMap.values())
    .map((combo) => ({
      ...combo,
      listingIds: Array.from(combo.listingIds),
    }))
    .sort((a, b) =>
      `${a.typeSlug}|${a.facilitySlug}|${a.countySlug}`.localeCompare(
        `${b.typeSlug}|${b.facilitySlug}|${b.countySlug}`,
        "ro"
      )
    );
}
