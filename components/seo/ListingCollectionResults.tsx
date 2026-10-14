import type { ReactNode } from "react";
import ListingsGrid from "@/components/listing/ListingGrid";
import type { Cazare } from "@/lib/utils";

type ListingCollectionResultsProps = {
  listings: Cazare[];
  emptyTitle: ReactNode;
  emptyDescription: ReactNode;
  className?: string;
};

export default function ListingCollectionResults({
  listings,
  emptyTitle,
  emptyDescription,
  className = "mt-12",
}: ListingCollectionResultsProps) {
  return (
    <section className={className}>
      {listings.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 px-6 py-10 text-center dark:border-white/10 dark:bg-zinc-900">
          <h2 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{emptyTitle}</h2>
          <p className="mx-auto max-w-2xl text-zinc-600 dark:text-zinc-400">{emptyDescription}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ListingsGrid cazari={listings} />
        </div>
      )}
    </section>
  );
}
