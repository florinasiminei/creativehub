export type Filters = {
  locatie: string;
  keyword: string;
  pretMin: number;
  pretMax: number;
  facilities: string[];
  persoaneMin: number;
  persoaneMax: number;
  camere: number;
  paturi: number;
  bai: number;
};

export type SearchSuggestionType =
  | "destinatie"
  | "localitate"
  | "judet"
  | "regiune"
  | "proprietate"
  | "facilitate";

export type SearchSuggestion = {
  id: string;
  label: string;
  value: string;
  type: SearchSuggestionType;
  count: number;
  context?: string;
  highlightRanges?: Array<[number, number]>;
  facilityId?: string;
};

export type WhatsAppButtonProps = {
  phone: string;
  message?: string;
};

export type PageProps = { 
  params: { 
    slug: string 
  } 
};

export type FacilityOption = {
  id: string;
  name: string;
};
export type ListingRaw = {
  id: string;
  title: string;
  slug?: string;
  phone?: string;
  type: string;
  location: string;
  capacity: string;
  price: string;
  rooms?: number | string | null;
  beds?: number | string | null;
  bathrooms?: number | string | null;
  camere?: number | string | null;
  paturi?: number | string | null;
  bai?: number | string | null;
  description?: string | null;
  highlights?: string[] | null;
  listing_images?: {
    image_url: string | null;
    display_order: number | null;
  }[];
  listing_facilities?: {
    facilities: {
      id: string;
      name: string;
    } | null;
  }[];
};
