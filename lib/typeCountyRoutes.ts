import { buildCountySegment } from "@/lib/locationRoutes";

export function buildTypeCountyPath(typeSlug: string, countySlug: string): string {
  return `/cazari/${String(typeSlug || "").trim()}/${buildCountySegment(String(countySlug || "").trim())}`;
}
