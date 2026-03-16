"use client";

import ListingFormSection from "./ListingFormSection";
import type { LocationData } from "./listingFormTypes";
import LocationPicker from "@/components/LocationPicker";

type ListingFormLocationSectionProps = {
  onLocationSelect: (location: LocationData) => void;
  onLocationConfirmChange?: (confirmed: boolean) => void;
  initialCounty: string;
  initialCity: string;
  resolvedCounty: string;
  resolvedLocality: string;
  initialLat?: number | null;
  initialLng?: number | null;
  autoLocate?: boolean;
};

export default function ListingFormLocationSection({
  onLocationSelect,
  onLocationConfirmChange,
  initialCounty,
  initialCity,
  resolvedCounty,
  resolvedLocality,
  initialLat = null,
  initialLng = null,
  autoLocate = true,
}: ListingFormLocationSectionProps) {
  return (
    <ListingFormSection step="pas 2" label="Localizare" title="Locatie pe harta" mobileFlat>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Selecteaza pozitia aproximativa. Poti da click pe harta sau trage pinul, apoi confirma locatia.
      </p>
      <LocationPicker
        onLocationSelect={onLocationSelect}
        onConfirmChange={onLocationConfirmChange}
        initialCounty={initialCounty}
        initialCity={initialCity}
        geocodeCounty={resolvedCounty || ""}
        geocodeCity={resolvedCounty ? resolvedLocality : ""}
        initialLat={initialLat}
        initialLng={initialLng}
        autoLocate={autoLocate}
      />
    </ListingFormSection>
  );
}
