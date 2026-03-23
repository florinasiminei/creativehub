export type FacilityOption = { id: string; name: string };

export type ListingFormFields = {
  titlu: string;
  judet: string;
  localitate: string;
  sat: string;
  pret: string;
  capacitate: string;
  camere: string;
  paturi: string;
  bai: string;
  descriere: string;
  telefon: string;
  tip: string;
};

export type LocationData = {
  latitude: number;
  longitude: number;
  county: string;
  city: string;
};

export type ExistingImage = {
  id: string;
  image_url: string;
  alt?: string | null;
  preview_url?: string | null;
};

type ListingLocationSource = {
  lat?: number | string | null;
  latitude?: number | string | null;
  lng?: number | string | null;
  longitude?: number | string | null;
  judet?: string | null;
  city?: string | null;
};

export function createEmptyListingFormFields(): ListingFormFields {
  return {
    titlu: "",
    judet: "",
    localitate: "",
    sat: "",
    pret: "",
    capacitate: "2",
    camere: "1",
    paturi: "1",
    bai: "1",
    descriere: "",
    telefon: "",
    tip: "cabana",
  };
}

export function mapListingToFormFields(listing: {
  title?: string | null;
  judet?: string | null;
  city?: string | null;
  sat?: string | null;
  price?: string | number | null;
  capacity?: string | number | null;
  camere?: string | number | null;
  paturi?: string | number | null;
  bai?: string | number | null;
  description?: string | null;
  phone?: string | null;
  type?: string | null;
}): ListingFormFields {
  return {
    titlu: listing.title || "",
    judet: listing.judet || "",
    localitate: listing.city || "",
    sat: listing.sat || "",
    pret: listing.price?.toString() || "",
    capacitate: (listing.capacity || 1).toString(),
    camere: (listing.camere ?? 0).toString(),
    paturi: (listing.paturi ?? 0).toString(),
    bai: (listing.bai ?? 0).toString(),
    descriere: listing.description || "",
    telefon: listing.phone || "",
    tip: listing.type || "cabana",
  };
}

export function mapListingToLocationData(listing: ListingLocationSource): LocationData {
  const latValue = listing.lat ?? listing.latitude;
  const lngValue = listing.lng ?? listing.longitude;
  const parsedLat =
    typeof latValue === "number" ? latValue : latValue ? parseFloat(String(latValue)) : 0;
  const parsedLng =
    typeof lngValue === "number" ? lngValue : lngValue ? parseFloat(String(lngValue)) : 0;

  return {
    latitude: Number.isFinite(parsedLat) ? parsedLat : 0,
    longitude: Number.isFinite(parsedLng) ? parsedLng : 0,
    county: listing.judet || "",
    city: listing.city || "",
  };
}

export function buildListingPayloadBase(formData: ListingFormFields, locationData: LocationData | null) {
  const hasCoords =
    locationData !== null &&
    Number.isFinite(locationData.latitude) &&
    Number.isFinite(locationData.longitude) &&
    (locationData.latitude !== 0 || locationData.longitude !== 0);

  return {
    judet: formData.judet || locationData?.county || null,
    city: formData.localitate || locationData?.city || null,
    sat: formData.sat || null,
    price: Number(formData.pret) || 0,
    capacity: formData.capacitate || "1",
    camere: Number(formData.camere) || 0,
    paturi: Number(formData.paturi) || 0,
    bai: Number(formData.bai) || 0,
    phone: formData.telefon || null,
    description: formData.descriere || null,
    type: formData.tip,
    lat: hasCoords ? Number(locationData?.latitude ?? null) : null,
    lng: hasCoords ? Number(locationData?.longitude ?? null) : null,
  };
}

export function withClientListingMeta<T extends Record<string, unknown>>(
  payload: T,
  options: {
    isClient: boolean;
    newsletterOptIn: boolean;
    acceptedTerms: boolean;
  }
) {
  if (!options.isClient) return payload;

  return {
    ...payload,
    newsletter_opt_in: options.newsletterOptIn,
    terms_accepted: options.acceptedTerms,
  };
}
