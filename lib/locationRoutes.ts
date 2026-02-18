import { findCountyBySlug, type CountyDefinition } from "@/lib/counties";
import { findRegionBySlug, type RegionDefinition } from "@/lib/regions";
import { slugify } from "@/lib/utils";

export type ListingLocationKind = "judet" | "localitate" | "regiune";

export type ResolvedListingLocation = {
  kind: ListingLocationKind;
  county?: CountyDefinition;
  region?: RegionDefinition;
  canonicalSegment: string;
  isCanonical: boolean;
};

export const COUNTY_SEGMENT_PREFIX = "judet-";
export const LOCALITY_SEGMENT_PREFIX = "localitate-";
export const REGION_SEGMENT_PREFIX = "regiune-";
export const FACILITY_SEGMENT_PREFIX = "cu-";

function normalizeSegment(value: string): string {
  return slugify(String(value || "").trim());
}

export function buildCountySegment(countySlug: string): string {
  const normalizedCounty = normalizeSegment(countySlug);
  return normalizedCounty ? `${COUNTY_SEGMENT_PREFIX}${normalizedCounty}` : "";
}

export function buildRegionSegment(region: Pick<RegionDefinition, "slug" | "type">): string {
  const normalizedRegion = normalizeSegment(region.slug);
  if (!normalizedRegion) return "";
  const prefix = region.type === "metro" ? LOCALITY_SEGMENT_PREFIX : REGION_SEGMENT_PREFIX;
  return `${prefix}${normalizedRegion}`;
}

export function buildRegionPagePath(region: Pick<RegionDefinition, "slug" | "type">): string {
  const normalizedRegion = normalizeSegment(region.slug);
  if (!normalizedRegion) return "/";
  return region.type === "metro" ? `/localitate/${normalizedRegion}` : `/regiune/${normalizedRegion}`;
}

export function buildTypeLocationPath(typeSlug: string, locationSegment: string): string {
  const normalizedType = normalizeSegment(typeSlug);
  const normalizedLocation = normalizeSegment(locationSegment);
  return `/cazari/${normalizedType}/${normalizedLocation}`;
}

export function buildTypeRegionPath(
  typeSlug: string,
  region: Pick<RegionDefinition, "slug" | "type">
): string {
  return buildTypeLocationPath(typeSlug, buildRegionSegment(region));
}

export function normalizeFacilitySlug(segment: string): string {
  const normalized = normalizeSegment(segment);
  if (!normalized) return "";
  return normalized.startsWith(FACILITY_SEGMENT_PREFIX)
    ? normalized.slice(FACILITY_SEGMENT_PREFIX.length)
    : normalized;
}

export function buildFacilitySegment(facilitySlug: string): string {
  const normalized = normalizeFacilitySlug(facilitySlug);
  return normalized ? `${FACILITY_SEGMENT_PREFIX}${normalized}` : "";
}

export function buildTypeFacilityCountyPath(
  typeSlug: string,
  countySlug: string,
  facilitySlug: string
): string {
  return `/cazari/${normalizeSegment(typeSlug)}/${buildCountySegment(countySlug)}/${buildFacilitySegment(
    facilitySlug
  )}`;
}

export function parseListingLocationSegment(rawSegment: string): ResolvedListingLocation | null {
  const normalizedSegment = normalizeSegment(rawSegment);
  if (!normalizedSegment) return null;

  if (normalizedSegment.startsWith(COUNTY_SEGMENT_PREFIX)) {
    const countySlug = normalizedSegment.slice(COUNTY_SEGMENT_PREFIX.length);
    const county = findCountyBySlug(countySlug);
    if (!county) return null;
    const canonicalSegment = buildCountySegment(county.slug);
    return {
      kind: "judet",
      county,
      canonicalSegment,
      isCanonical: normalizedSegment === canonicalSegment,
    };
  }

  if (
    normalizedSegment.startsWith(LOCALITY_SEGMENT_PREFIX) ||
    normalizedSegment.startsWith(REGION_SEGMENT_PREFIX)
  ) {
    const hintedKind: ListingLocationKind = normalizedSegment.startsWith(LOCALITY_SEGMENT_PREFIX)
      ? "localitate"
      : "regiune";
    const regionSlug = normalizedSegment.slice(
      hintedKind === "localitate" ? LOCALITY_SEGMENT_PREFIX.length : REGION_SEGMENT_PREFIX.length
    );
    const region = findRegionBySlug(regionSlug);
    if (!region) return null;

    const resolvedKind: ListingLocationKind = region.type === "metro" ? "localitate" : "regiune";
    const canonicalSegment = buildRegionSegment(region);
    return {
      kind: resolvedKind,
      region,
      canonicalSegment,
      isCanonical: resolvedKind === hintedKind && normalizedSegment === canonicalSegment,
    };
  }

  const legacyCounty = findCountyBySlug(normalizedSegment);
  if (legacyCounty) {
    return {
      kind: "judet",
      county: legacyCounty,
      canonicalSegment: buildCountySegment(legacyCounty.slug),
      isCanonical: false,
    };
  }

  const legacyRegion = findRegionBySlug(normalizedSegment);
  if (legacyRegion) {
    const resolvedKind: ListingLocationKind = legacyRegion.type === "metro" ? "localitate" : "regiune";
    return {
      kind: resolvedKind,
      region: legacyRegion,
      canonicalSegment: buildRegionSegment(legacyRegion),
      isCanonical: false,
    };
  }

  return null;
}
