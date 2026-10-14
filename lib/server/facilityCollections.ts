import "server-only";
import { cache } from "react";
import { getFacilityCollections } from "@/lib/facilityCollections";
import { fetchPublishedListingSummaries } from "@/lib/publicListingCollections";

export const getPublishedFacilityCollections = cache(async () => {
  const listings = await fetchPublishedListingSummaries();
  return getFacilityCollections(listings);
});
