import { slugify, type Cazare } from "./utils";
import type { ListingRaw } from "./types";

function safeNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    const digits = value.match(/[\d.,]+/g)?.join("") || "";
    const normalized = digits.replace(/[.,](?=\d{3}\b)/g, "");
    const numeric = Number(normalized.replace(",", "."));
    if (Number.isFinite(numeric)) return numeric;
  }
  return fallback;
}

function extractFacilities(listingFacilities: ListingRaw["listing_facilities"]) {
  const ids: string[] = [];
  const names: string[] = [];
  for (const entry of listingFacilities || []) {
    const facility = entry?.facilities;
    if (facility?.id && facility?.name) {
      ids.push(facility.id);
      names.push(facility.name);
    }
  }
  return { ids, names };
}

export function mapListingSummary(row: ListingRaw, fallbackImage = "/fallback.svg"): Cazare {
  const coverCandidate =
    Array.isArray(row.listing_images) && row.listing_images.length > 0
      ? String(row.listing_images[0]?.image_url ?? "").trim()
      : "";
  const image = coverCandidate || fallbackImage;

  const { ids, names } = extractFacilities(row.listing_facilities);
  const camere = safeNumber(
    (row as any).rooms ??
      (row as any).camere ??
      (row as any).num_camere ??
      (row as any).num_rooms ??
      (row as any).bedrooms,
    0
  );
  const paturi = safeNumber(
    (row as any).beds ??
      (row as any).paturi ??
      (row as any).num_paturi ??
      (row as any).num_beds ??
      (row as any).pat,
    0
  );
  const bai = safeNumber(
    (row as any).bathrooms ??
      (row as any).bai ??
      (row as any).num_bai ??
      (row as any).num_bathrooms ??
      (row as any).bath,
    0
  );

  return {
    id: row.id,
    title: row.title,
    slug: row.slug || `${slugify(row.title)}-${row.id}`,
    price: safeNumber(row.price, 0),
    tip: row.type,
    locatie: row.location,
    numarPersoane: safeNumber(row.capacity, 1),
    camere,
    paturi,
    bai,
    facilities: ids,
    facilitiesNames: names,
    image,
    phone: row.phone ? String(row.phone) : undefined,
  };
}
