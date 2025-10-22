import { slugify } from "./utils";
import type { Cazare } from "./types";
import type { FacilityOption, ListingRaw } from "./types";

export function safeNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    const digits = value.match(/[\d.,]+/g)?.join("") ?? "";
    const normalized = digits.replace(/[.,](?=\d{3}\b)/g, "");
    const numeric = Number(normalized.replace(",", "."));
    if (Number.isFinite(numeric)) return numeric;
  }
  return fallback;
}

export function extractFacilities(
  listingFacilities: ListingRaw["listing_facilities"]
): {
  ids: string[];
  names: string[];
  options: FacilityOption[];
} {
  const ids: string[] = [];
  const names: string[] = [];
  const options: FacilityOption[] = [];

  for (const entry of listingFacilities ?? []) {
    const facility = entry?.facilities;
    if (facility?.id && facility?.name) {
      ids.push(facility.id);
      names.push(facility.name);
      options.push({ id: facility.id, name: facility.name });
    }
  }

  return { ids, names, options };
}

export function mapListingSummary(row: ListingRaw, fallbackImage = "/fallback.jpg"): Cazare {
  const coverCandidate =
    Array.isArray(row.listing_images) && row.listing_images.length > 0
      ? String(row.listing_images[0]?.image_url ?? "").trim()
      : "";
  const image = coverCandidate || fallbackImage;

  const { ids, names } = extractFacilities(row.listing_facilities);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug || `${slugify(row.title)}-${row.id}`,
    price: safeNumber(row.price, 0),
    tip: row.type,
    locatie: row.location,
    numarPersoane: safeNumber(row.capacity, 1),
    facilities: ids,
    facilitiesNames: names,
    image,
    phone: row.phone ? String(row.phone) : undefined,
  };
}
