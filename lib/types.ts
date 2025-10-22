export type Filters = {
  locatie: string;
  keyword: string;
  pretMin: number;
  pretMax: number;
  facilities: string[];
  persoaneMin: number;
  persoaneMax: number;
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
