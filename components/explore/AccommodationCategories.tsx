import Link from "next/link";
import ExploreGrid from "@/components/explore/ExploreGrid";
import { getCategoryPhoto, getDestinationPhoto } from "@/lib/exploreCards";
import { getFacilityCollections } from "@/lib/facilityCollections";
import { LISTING_TYPES } from "@/lib/listingTypes";
import type { Cazare } from "@/lib/utils";

type AccommodationCategoriesProps = {
  listings: Cazare[];
  destinations: Array<{ name: string; slug: string; count: number }>;
  showAllCategoriesLink?: boolean;
};

export default function AccommodationCategories({
  listings,
  destinations,
  showAllCategoriesLink = false,
}: AccommodationCategoriesProps) {
  const types = LISTING_TYPES.map((type) => ({
    href: `/cazari/${type.slug}`,
    title: type.label,
    count: listings.filter((listing) => listing.tip === type.value).length,
    ...getCategoryPhoto(type.slug),
  })).filter((type) => type.count > 0);
  const facilityCollections = getFacilityCollections(listings).filter((collection) => collection.count > 0);

  return (
    <>
      <section aria-labelledby="exploreaza-tipuri-cazare">
        <h2 id="exploreaza-tipuri-cazare" className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Explorează cazările după tip
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Alege tipul de cazare potrivit pentru vacanța ta și contactează direct proprietarul.
        </p>
        <ExploreGrid items={types} />
      </section>

      {facilityCollections.length > 0 && (
        <section className="mt-14" aria-labelledby="exploreaza-facilitati-cazare">
          <h2 id="exploreaza-facilitati-cazare" className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Alege cazarea după facilități
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Găsește un loc cu ciubăr, o cazare care acceptă animale de companie sau o proprietate cu piscină.
          </p>
          <ExploreGrid columns={types.length} items={facilityCollections.map((collection) => ({
            href: `/cazari/${collection.slug}`,
            title: collection.label,
            count: collection.count,
            image: collection.image,
            imageAlt: collection.imageAlt,
          }))} />
        </section>
      )}

      {showAllCategoriesLink && (
        <Link
          href="/cazari"
          className="mt-6 inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          Explorează toate categoriile
        </Link>
      )}

      {destinations.length > 0 && (
        <section className="mt-14" aria-labelledby="exploreaza-destinatii-cazare">
          <h2 id="exploreaza-destinatii-cazare" className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Unde vrei să mergi?</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Descoperă cazările din destinațiile preferate.</p>
          <ExploreGrid columns={types.length} items={destinations.map((county) => ({
            href: `/judet/${county.slug}`,
            title: county.name,
            count: county.count,
            ...getDestinationPhoto(county.slug),
          }))} />
        </section>
      )}
    </>
  );
}
