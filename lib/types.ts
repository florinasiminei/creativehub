export type Filters = {
  locatie: string;
  keyword: string;
  pretMin: number;
  pretMax: number;
  tipuri: string[];
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
  address?: string | null;
  capacity: string;
  price: string;
  camere?: number | string | null;
  paturi?: number | string | null;
  bai?: number | string | null;
  description?: string | null;
  highlights?: string[] | null;
  display_order?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  search_radius?: number | null;
  listing_images?: {
    image_url: string | null;
    display_order: number | null;
  }[];
  edit_token?: string | null;
  listing_facilities?: {
    facilities: {
      id: string;
      name: string;
    } | null;
  }[];
};
