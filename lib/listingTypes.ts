export type ListingTypeValue =
  | "cabana"
  | "a-frame"
  | "pensiune"
  | "apartament"
  | "tiny house"
  | "casa de vacanta";

export type ListingTypeOption = {
  value: ListingTypeValue;
  label: string;
  singular: string;
  slug: string;
};

export const LISTING_TYPES: ListingTypeOption[] = [
  {
    value: "cabana",
    label: "Cabane autentice",
    singular: "Cabană autentică",
    slug: "cabane",
  },
  {
    value: "a-frame",
    label: "A-Frame",
    singular: "A-Frame",
    slug: "a-frame",
  },
  {
    value: "pensiune",
    label: "Pensiuni",
    singular: "Pensiune",
    slug: "pensiuni",
  },
  {
    value: "apartament",
    label: "Apartamente",
    singular: "Apartament",
    slug: "apartamente",
  },
  {
    value: "tiny house",
    label: "Tiny houses",
    singular: "Tiny house",
    slug: "tiny-house",
  },
  {
    value: "casa de vacanta",
    label: "Case de vacanță",
    singular: "Casă de vacanță",
    slug: "case-de-vacanta",
  },
];

export function getTypeBySlug(slug: string) {
  return LISTING_TYPES.find((type) => type.slug === slug) ?? null;
}

export function getTypeLabel(value: string) {
  return LISTING_TYPES.find((type) => type.value === value)?.label ?? value;
}
