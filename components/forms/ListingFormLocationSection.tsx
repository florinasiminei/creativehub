"use client";

import ListingFormSection from "./ListingFormSection";
import FormMessage from "./FormMessage";
import type { LocationData } from "./listingFormTypes";
import LocationPicker from "@/components/LocationPicker";
import type { ReactNode } from "react";

type ListingFormLocationSectionProps = {
  onLocationSelect: (location: LocationData) => void;
  onLocationConfirmChange?: (confirmed: boolean) => void;
  initialCounty: string;
  initialCity: string;
  resolvedCounty: string;
  resolvedLocality: string;
  initialLat?: number | null;
  initialLng?: number | null;
  initialConfirmed?: boolean;
  autoLocate?: boolean;
  stepLabel?: string;
  wizardStep?: boolean;
  showValidation?: boolean;
  locationInvalid?: boolean;
  children?: ReactNode;
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
  initialConfirmed = false,
  autoLocate = true,
  stepLabel = "pas 2",
  wizardStep = false,
  showValidation = false,
  locationInvalid = false,
  children,
}: ListingFormLocationSectionProps) {
  return (
    <ListingFormSection step={stepLabel} label="Localizare" title="Locație pe hartă" mobileFlat>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {wizardStep
          ? "Caută proprietatea sau poziționează pinul, apoi confirmă locația. Precompletăm datele disponibile; verifică județul, localitatea și satul de mai jos."
          : "Selecteaza pozitia aproximativa. Poti da click pe harta sau trage pinul, apoi confirma locatia."}
      </p>
      {showValidation && locationInvalid && (
        <FormMessage variant="error">
          Poziționează pinul și confirmă locația înainte de a continua.
        </FormMessage>
      )}
      <LocationPicker
        onLocationSelect={onLocationSelect}
        onConfirmChange={onLocationConfirmChange}
        initialCounty={initialCounty}
        initialCity={initialCity}
        geocodeCounty={resolvedCounty || ""}
        geocodeCity={resolvedCounty ? resolvedLocality : ""}
        initialLat={initialLat}
        initialLng={initialLng}
        initialConfirmed={initialConfirmed}
        autoLocate={autoLocate}
      />
      {children}
    </ListingFormSection>
  );
}
