export type Filters = {
  locatie: string;
  keyword: string;
  pretMin: number;
  pretMax: number;
  facilities: string[];
  persoaneMin: number;
  persoaneMax: number;
};
export type ListingRaw = {
  id: string;
  title: string;
  type: string;
  location: string;
  capacity: string;
  price: string;
  listing_facilities: {
    facilities: {
      id: string;
      name: string;
    }[];
  }[];
};
