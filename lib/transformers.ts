import { slugify, type Cazare } from "./utils";
import type { ListingRaw } from "./types";

function safeNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalizedInput = value.trim();
    const rangeMatch = normalizedInput.match(/^(\d+)\s*[-/]\s*(\d+)\s*$/);
    if (rangeMatch) {
      const minVal = Number(rangeMatch[1]);
      const maxVal = Number(rangeMatch[2]);
      if (Number.isFinite(minVal) && Number.isFinite(maxVal)) {
        return Math.max(minVal, maxVal);
      }
    }
    const plusMatch = normalizedInput.match(/^(\d+)\s*\+\s*$/);
    if (plusMatch) {
      const base = Number(plusMatch[1]);
      if (Number.isFinite(base)) return base;
    }
    const parsed = Number(normalizedInput);
    if (Number.isFinite(parsed)) return parsed;
    const digits = normalizedInput.match(/[\d.,]+/g)?.join("") || "";
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
  const address = typeof row.address === "string" ? row.address.trim() : "";
  const locationLabel = address ? `${address}, ${row.location}` : row.location;

  const { ids, names } = extractFacilities(row.listing_facilities);
  const camere = safeNumber((row as any).camere, 0);
  const paturi = safeNumber((row as any).paturi, 0);
  const bai = safeNumber((row as any).bai, 0);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug || `${slugify(row.title)}-${row.id}`,
    price: safeNumber(row.price, 0),
    tip: row.type,
    locatie: locationLabel,
    numarPersoane: String(row.capacity).trim(),
    camere,
    paturi,
    bai,
    facilities: ids,
    facilitiesNames: names,
    image,
    phone: row.phone ? String(row.phone) : undefined,
  };
}
