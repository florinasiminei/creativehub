import React from 'react';
import ListingFormSection from './ListingFormSection';
import FacilitiesPicker from './FacilitiesPicker';
import ImageUploader from './ImageUploader';
import LocationPicker from '@/components/LocationPicker';

type FacilityOption = { id: string; name: string };

type ListingFormFields = {
  titlu: string;
  judet: string;
  localitate: string;
  pret: string;
  capacitate: string;
  descriere: string;
  telefon: string;
  tip: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
  county: string;
  city: string;
  radius: number;
};

type ListingFormProps = {
  formData: ListingFormFields;
  onChange: (key: keyof ListingFormFields, value: string) => void;
  facilities: FacilityOption[];
  selectedFacilities: string[];
  onToggleFacility: (id: string) => void;
  onLocationSelect: (location: LocationData) => void;
  initialCounty: string;
  initialCity: string;
  initialLat?: number | null;
  initialLng?: number | null;
  dropzoneTitle: string;
  dropzoneSubtitle: string;
  dropzoneHelper: string;
  showValidation: boolean;
  invalidFields: string[];
  imagesInvalid: boolean;
  isDropActive: boolean;
  onDropActiveChange: (active: boolean) => void;
  onFilesSelected: (files: File[]) => void;
  files: File[];
  previews: string[];
  draggingIdx: number | null;
  onDragStart: (idx: number) => void;
  onDragOver: (idx: number) => void;
  onDragEnd: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: (idx: number) => void;
  selectedImagesTitle: string;
  selectedImagesSubtitle: string;
  selectedFailedNames?: string[];
  existingImages?: { id: string; image_url: string; alt?: string | null }[];
  existingTitle?: string;
  existingSubtitle?: string;
  existingDraggingIdx?: number | null;
  onExistingDragStart?: (idx: number) => void;
  onExistingDragOver?: (idx: number) => void;
  onExistingDragEnd?: () => void;
  onExistingMove?: (from: number, to: number) => void;
  onExistingDelete?: (img: { id: string; image_url: string; alt?: string | null }) => void;
};

export default function ListingForm({
  formData,
  onChange,
  facilities,
  selectedFacilities,
  onToggleFacility,
  onLocationSelect,
  initialCounty,
  initialCity,
  initialLat = null,
  initialLng = null,
  dropzoneTitle = 'Incarca imagini',
  dropzoneSubtitle = 'Accepta .jpg, .png, .webp, .avif, .heic',
  dropzoneHelper = 'Click pentru a selecta',
  showValidation = false,
  invalidFields = [],
  imagesInvalid = false,
  isDropActive,
  onDropActiveChange,
  onFilesSelected,
  files,
  previews,
  draggingIdx,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMove,
  onRemove,
  selectedImagesTitle,
  selectedImagesSubtitle,
  selectedFailedNames = [],
  existingImages = [],
  existingTitle,
  existingSubtitle,
  existingDraggingIdx = null,
  onExistingDragStart,
  onExistingDragOver,
  onExistingDragEnd,
  onExistingMove,
  onExistingDelete,
}: ListingFormProps) {
  const isInvalid = (key: string) => showValidation && invalidFields.includes(key);
  const inputClass = (invalid: boolean) =>
    `mt-1 rounded-lg border px-3 py-2 focus:ring-2 bg-white text-gray-900 placeholder:text-gray-400 ${
      invalid
        ? 'border-red-400 bg-red-50 focus:ring-red-500 dark:border-red-500 dark:bg-red-950/40'
        : 'border-gray-200 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900'
    } dark:text-gray-100 dark:placeholder:text-gray-500`;
  const labelClass = (invalid: boolean) =>
    `flex flex-col ${invalid ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`;

  return (
    <>
      <ListingFormSection step="pas 1" label="Detalii principale" title="Identitate și contact">
        <label className={labelClass(isInvalid('titlu'))}>
          <span className="text-sm font-medium">Titlu</span>
          <input
            value={formData.titlu}
            onChange={(e) => onChange('titlu', e.target.value)}
            required
            autoComplete="off"
            maxLength={90}
            className={inputClass(isInvalid('titlu'))}
            aria-invalid={isInvalid('titlu')}
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={labelClass(isInvalid('judet'))}>
          <span className="text-sm font-medium">Județ</span>
            <input
              value={formData.judet}
              onChange={(e) => onChange('judet', e.target.value)}
              required
              autoComplete="address-level1"
              className={inputClass(isInvalid('judet'))}
              aria-invalid={isInvalid('judet')}
            />
          </label>
          <label className={labelClass(isInvalid('localitate'))}>
            <span className="text-sm font-medium">Localitate</span>
            <input
              value={formData.localitate}
              onChange={(e) => onChange('localitate', e.target.value)}
              required
              autoComplete="address-level2"
              className={inputClass(isInvalid('localitate'))}
              aria-invalid={isInvalid('localitate')}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={labelClass(isInvalid('pret'))}>
          <span className="text-sm font-medium">Preț (lei/noapte)</span>
            <input
              value={formData.pret}
              onChange={(e) => onChange('pret', e.target.value)}
              type="number"
              inputMode="numeric"
              min={0}
              required
              className={inputClass(isInvalid('pret'))}
              aria-invalid={isInvalid('pret')}
            />
          </label>
          <label className={labelClass(isInvalid('capacitate'))}>
            <span className="text-sm font-medium">Capacitate (pers.)</span>
            <input
              value={formData.capacitate}
              onChange={(e) => onChange('capacitate', e.target.value)}
              type="number"
              inputMode="numeric"
              min={1}
              required
              className={inputClass(isInvalid('capacitate'))}
              aria-invalid={isInvalid('capacitate')}
            />
          </label>
        </div>

        <label className={labelClass(isInvalid('telefon'))}>
          <span className="text-sm font-medium">Telefon</span>
          <input
            value={formData.telefon}
            onChange={(e) => onChange('telefon', e.target.value)}
            required
            inputMode="tel"
            autoComplete="tel"
            className={inputClass(isInvalid('telefon'))}
            aria-invalid={isInvalid('telefon')}
          />
          <span className="text-xs text-gray-500 mt-1 dark:text-gray-400">Ex: 07xx xxx xxx sau +40 7xx xxx xxx</span>
        </label>

        <label className={labelClass(isInvalid('tip'))}>
          <span className="text-sm font-medium">Tip</span>
          <select
            value={formData.tip}
            onChange={(e) => onChange('tip', e.target.value)}
            className={inputClass(isInvalid('tip'))}
            aria-invalid={isInvalid('tip')}
          >
            <option value="cabana">Cabană</option>
            <option value="apartment">Apartament</option>
            <option value="vila">Vilă</option>
          </select>
        </label>

        <label className={labelClass(isInvalid('descriere'))}>
          <span className="text-sm font-medium">
            Descriere <span className="text-gray-500 dark:text-gray-400">(opțional)</span>
          </span>
          <textarea
            value={formData.descriere}
            onChange={(e) => onChange('descriere', e.target.value)}
            className={inputClass(isInvalid('descriere'))}
            rows={4}
            aria-invalid={isInvalid('descriere')}
          />
        </label>

        <FacilitiesPicker facilities={facilities} selected={selectedFacilities} onToggle={onToggleFacility} />
      </ListingFormSection>

      <ListingFormSection step="pas 2" label="Localizare" title="Locație pe hartă">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Selectează poziția aproximativă. Poți da click pe hartă sau trage pinul, apoi ajustează raza de confidențialitate.
        </p>
        <LocationPicker
          onLocationSelect={onLocationSelect}
          initialCounty={initialCounty}
          initialCity={initialCity}
          initialLat={initialLat}
          initialLng={initialLng}
        />
      </ListingFormSection>

      <ListingFormSection step="pas 3" label="Galerie" title="Ordine imagini">
        <ImageUploader
          dropzoneTitle={dropzoneTitle}
          dropzoneSubtitle={dropzoneSubtitle}
          dropzoneHelper={dropzoneHelper}
          accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/heic,image/heif,image/*"
          isActive={isDropActive}
          isInvalid={showValidation && imagesInvalid}
          onActiveChange={onDropActiveChange}
          onFilesSelected={onFilesSelected}
          files={files}
          previews={previews}
          draggingIdx={draggingIdx}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onMove={onMove}
          onRemove={onRemove}
          selectedTitle={selectedImagesTitle}
          selectedSubtitle={selectedImagesSubtitle}
          selectedFailedNames={selectedFailedNames}
          existingImages={existingImages}
          existingTitle={existingTitle}
          existingSubtitle={existingSubtitle}
          existingDraggingIdx={existingDraggingIdx}
          onExistingDragStart={onExistingDragStart}
          onExistingDragOver={onExistingDragOver}
          onExistingDragEnd={onExistingDragEnd}
          onExistingMove={onExistingMove}
          onExistingDelete={onExistingDelete}
        />
      </ListingFormSection>
    </>
  );
}
