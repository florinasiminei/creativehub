'use client';

import ListingFormSection from '@/components/forms/ListingFormSection';
import LocationPicker from '@/components/LocationPicker';
import type { AttractionLocationData } from '@/lib/attractions/attractionForm';

type AttractionFormLocationSectionProps = {
  visible: boolean;
  step: string;
  judet: string;
  localitate: string;
  resolvedCounty: string;
  resolvedLocality: string;
  locationData: AttractionLocationData | null;
  onChangeCounty: (value: string) => void;
  onChangeLocality: (value: string) => void;
  onLocationSelect: (location: AttractionLocationData) => void;
  onConfirmChange: (confirmed: boolean) => void;
};

export default function AttractionFormLocationSection({
  visible,
  step,
  judet,
  localitate,
  resolvedCounty,
  resolvedLocality,
  locationData,
  onChangeCounty,
  onChangeLocality,
  onLocationSelect,
  onConfirmChange,
}: AttractionFormLocationSectionProps) {
  if (!visible) return null;

  return (
    <ListingFormSection step={step} label="Localizare" title="Locatie pe harta (optional)">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Daca vrei, poti adauga pin-ul exact pe harta pentru folosire viitoare in &quot;atractii in apropiere&quot;.
      </p>
      <LocationPicker
        onLocationSelect={(location) => {
          onLocationSelect(location);
          if (!judet && location.county) onChangeCounty(location.county);
          if (!localitate && location.city) onChangeLocality(location.city);
        }}
        onConfirmChange={onConfirmChange}
        initialCounty={judet || locationData?.county || ''}
        initialCity={localitate || locationData?.city || ''}
        initialLat={locationData?.latitude ?? null}
        initialLng={locationData?.longitude ?? null}
        geocodeCounty={resolvedCounty || ''}
        geocodeCity={resolvedCounty ? resolvedLocality : ''}
        autoLocate={false}
      />
    </ListingFormSection>
  );
}
