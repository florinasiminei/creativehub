export type AttractionFormFields = {
  title: string;
  judet: string;
  localitate: string;
  sat: string;
  price: string;
  description: string;
};

export type AttractionFormState = AttractionFormFields & {
  honeypot: string;
};

export type AttractionLocationData = {
  latitude: number;
  longitude: number;
  county: string;
  city: string;
};

export type AttractionImage = {
  id: string;
  image_url: string;
  display_order?: number | null;
  alt?: string | null;
};

export function createEmptyAttractionFormFields(): AttractionFormFields {
  return {
    title: '',
    judet: '',
    localitate: '',
    sat: '',
    price: '',
    description: '',
  };
}

export function createEmptyAttractionFormState(): AttractionFormState {
  return {
    ...createEmptyAttractionFormFields(),
    honeypot: '',
  };
}

export function mapAttractionToFormFields(attraction: any): AttractionFormFields {
  return {
    title: String(attraction?.title || ''),
    judet: String(attraction?.judet || ''),
    localitate: String(attraction?.city || ''),
    sat: String(attraction?.sat || ''),
    price:
      attraction?.price === null || attraction?.price === undefined || attraction?.price === ''
        ? ''
        : String(attraction.price),
    description: String(attraction?.description || ''),
  };
}

export function mapAttractionToLocationData(attraction: any): AttractionLocationData | null {
  const latValue =
    typeof attraction?.lat === 'number' ? attraction.lat : attraction?.lat ? Number(attraction.lat) : 0;
  const lngValue =
    typeof attraction?.lng === 'number' ? attraction.lng : attraction?.lng ? Number(attraction.lng) : 0;
  const hasCoords =
    Number.isFinite(latValue) && Number.isFinite(lngValue) && (latValue !== 0 || lngValue !== 0);

  if (!hasCoords) return null;

  return {
    latitude: latValue,
    longitude: lngValue,
    county: String(attraction?.judet || ''),
    city: String(attraction?.city || ''),
  };
}

export function hasAttractionCoordinates(locationData: AttractionLocationData | null) {
  return Boolean(
    locationData &&
      Number.isFinite(locationData.latitude) &&
      Number.isFinite(locationData.longitude) &&
      (locationData.latitude !== 0 || locationData.longitude !== 0)
  );
}

export function buildAttractionPayload(
  formData: AttractionFormFields,
  locationData: AttractionLocationData | null
) {
  const parsedPrice = Number(formData.price);
  const judet = formData.judet.trim() || locationData?.county?.trim() || null;
  const city = formData.localitate.trim() || locationData?.city?.trim() || null;
  const sat = formData.sat.trim() || null;
  const locationName = [sat, city, judet].filter(Boolean).join(', ') || null;
  const hasCoords = hasAttractionCoordinates(locationData);

  return {
    title: formData.title.trim(),
    location_name: locationName,
    price: formData.price.trim() ? (Number.isFinite(parsedPrice) ? parsedPrice : null) : null,
    description: formData.description.trim() || null,
    judet,
    city,
    sat,
    lat: hasCoords ? Number(locationData?.latitude ?? null) : null,
    lng: hasCoords ? Number(locationData?.longitude ?? null) : null,
  };
}
