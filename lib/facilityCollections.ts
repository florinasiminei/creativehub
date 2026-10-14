import { normalizeRegionText } from "@/lib/regions";
import type { Cazare } from "@/lib/utils";

export const FACILITY_COLLECTIONS = [
  {
    slug: "cu-ciubar",
    label: "Cu ciubăr / jacuzzi",
    title: "Cazări cu ciubăr sau jacuzzi în România",
    facilityName: "Ciubăr / Jacuzzi",
    description: "Descoperă cabane, tiny houses și case de vacanță cu ciubăr sau jacuzzi. Compară proprietățile și contactează direct gazda.",
    advice: "Întreabă gazda dacă ciubărul sau jacuzzi-ul este privat, dacă încălzirea se plătește separat și dacă trebuie rezervat înainte de sosire.",
  },
  {
    slug: "pet-friendly",
    label: "Pet friendly",
    title: "Cazări pet friendly în România",
    facilityName: "Pet friendly",
    description: "Găsește cazări care acceptă animale de companie. Compară proprietățile pet friendly din România și discută direct cu gazda.",
    advice: "Înainte de rezervare, confirmă cu gazda numărul și talia animalelor acceptate, eventualele taxe și regulile de acces în proprietate.",
  },
  {
    slug: "cu-piscina",
    label: "Cu piscină",
    title: "Cazări cu piscină în România",
    facilityName: "Piscină",
    description: "Explorează cazări cu piscină în România. Compară proprietățile disponibile și contactează gazda pentru detalii și rezervare.",
    advice: "Confirmă dacă piscina este privată sau comună, interioară sau exterioară, perioada de funcționare și dacă accesul este inclus în preț.",
  },
] as const;

export function getFacilityCollectionBySlug(slug: string) {
  return FACILITY_COLLECTIONS.find((collection) => collection.slug === slug) ?? null;
}

export function getFacilityCollections(listings: Cazare[]) {
  return FACILITY_COLLECTIONS.map((collection) => {
    const facilityName = normalizeRegionText(collection.facilityName);
    const matchingListings = listings.filter((listing) =>
      listing.facilitiesNames.some((name) => normalizeRegionText(name) === facilityName)
    );
    const cover = matchingListings.find((listing) => listing.image && listing.image !== "/fallback.svg");

    return {
      ...collection,
      listings: matchingListings,
      count: matchingListings.length,
      image: cover?.image,
      imageAlt: cover ? `${cover.title} — ${collection.label.toLowerCase()}` : undefined,
    };
  });
}
