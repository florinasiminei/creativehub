import type { ReactNode } from "react";
import ListingsGrid from "@/components/listing/ListingGrid";
import type { Cazare } from "@/lib/utils";

type ListingCollectionResultsProps = {
  listings: Cazare[];
  emptyTitle: ReactNode;
  emptyDescription: ReactNode;
  className?: string;
};

function getMaxCapacity(value: Cazare["numarPersoane"]) {
  const matches = String(value ?? "").match(/\d+/g);
  if (!matches?.length) return 0;
  return Math.max(...matches.map(Number).filter(Number.isFinite));
}

function getMostCommonFacilityNames(listings: Cazare[], limit = 3) {
  const counts = new Map<string, number>();

  listings.forEach((listing) => {
    new Set(listing.facilitiesNames.filter(Boolean)).forEach((name) => {
      counts.set(name, (counts.get(name) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ro"))
    .slice(0, limit)
    .map(([name]) => name);
}

export default function ListingCollectionResults({
  listings,
  emptyTitle,
  emptyDescription,
  className = "mt-12",
}: ListingCollectionResultsProps) {
  const validPrices = listings
    .map((listing) => Number(listing.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  const minimumPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
  const maximumCapacity = listings.reduce(
    (maximum, listing) => Math.max(maximum, getMaxCapacity(listing.numarPersoane)),
    0
  );
  const commonFacilities = getMostCommonFacilityNames(listings);

  return (
    <section className={className}>
      {listings.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 px-6 py-10 text-center dark:border-white/10 dark:bg-zinc-900">
          <h2 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{emptyTitle}</h2>
          <p className="mx-auto max-w-2xl text-zinc-600 dark:text-zinc-400">{emptyDescription}</p>
        </div>
      ) : (
        <>
          <p className="mb-7 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm leading-6 text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
            Selecția include {listings.length} {listings.length === 1 ? "proprietate" : "proprietăți"}
            {minimumPrice !== null ? `, cu prețuri de la ${minimumPrice} lei pe noapte` : ""}
            {maximumCapacity > 0 ? ` și opțiuni pentru grupuri de până la ${maximumCapacity} persoane` : ""}
            {commonFacilities.length > 0
              ? `. Printre facilitățile întâlnite cel mai des se numără ${commonFacilities.join(", ")}`
              : ""}
            .
          </p>
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <ListingsGrid cazari={listings} />
          </div>
        </>
      )}
    </section>
  );
}
