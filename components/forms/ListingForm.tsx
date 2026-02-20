"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Combobox } from '@headlessui/react';
import ListingFormSection from './ListingFormSection';
import FacilitiesPicker from './FacilitiesPicker';
import ImageUploader from './ImageUploader';
import FormMessage from './FormMessage';
import LocationPicker from '@/components/LocationPicker';
import { validateCapacity, validateDescriptionLength, validatePhone } from '@/lib/validation/listing';
import useFocusFirstInvalid from '@/hooks/useFocusFirstInvalid';

type FacilityOption = { id: string; name: string };

type ListingFormFields = {
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

type LocationData = {
  latitude: number;
  longitude: number;
  county: string;
  city: string;
};

type ListingFormProps = {
  formData: ListingFormFields;
  onChange: (key: keyof ListingFormFields, value: string) => void;
  facilities: FacilityOption[];
  selectedFacilities: string[];
  onToggleFacility: (id: string) => void;
  onLocationSelect: (location: LocationData) => void;
  onLocationConfirmChange?: (confirmed: boolean) => void;
  autoLocate?: boolean;
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
  validationAttempt?: number;
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
  maxImagesWarning?: number;
  descriptionMin?: number;
  descriptionMax?: number;
  descriptionRequired?: boolean;
};

export default function ListingForm({
  formData,
  onChange,
  facilities,
  selectedFacilities,
  onToggleFacility,
  onLocationSelect,
  onLocationConfirmChange,
  autoLocate = true,
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
  validationAttempt = 0,
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
  maxImagesWarning,
  descriptionMin,
  descriptionMax,
  descriptionRequired = false,
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

  const [locationsData, setLocationsData] = useState<Record<string, Array<{ nume: string }>> | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [countyQuery, setCountyQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [capacityTouched, setCapacityTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadLocations() {
      try {
        const resp = await fetch('/data/ro-orase-dupa-judet.min.json');
        if (!resp.ok) throw new Error('Nu am putut încărca județele.');
        const data = (await resp.json()) as Record<string, Array<{ nume: string }>>;
        if (mounted) setLocationsData(data);
      } catch (err) {
        if (mounted) setLocationsError(err instanceof Error ? err.message : 'Eroare la încărcarea localităților');
      }
    }
    loadLocations();
    return () => {
      mounted = false;
    };
  }, []);

  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const counties = useMemo(() => (locationsData ? Object.keys(locationsData) : []), [locationsData]);
  const filteredCounties = useMemo(() => {
    const query = normalize(countyQuery);
    if (!query) return counties;
    return counties.filter((county) => normalize(county).includes(query));
  }, [counties, countyQuery]);

  const resolvedCounty = useMemo(() => {
    if (!locationsData || !formData.judet) return '';
    if (locationsData[formData.judet]) return formData.judet;
    const normalized = normalize(formData.judet);
    return counties.find((county) => normalize(county) === normalized) || '';
  }, [locationsData, formData.judet, counties]);

  const localities = useMemo(() => {
    if (!locationsData || !resolvedCounty) return [];
    return locationsData[resolvedCounty] || [];
  }, [locationsData, resolvedCounty]);

  const resolvedLocality = useMemo(() => {
    if (!resolvedCounty || !formData.localitate) return '';
    const normalized = normalize(formData.localitate);
    return localities.find((loc) => normalize(loc.nume) === normalized)?.nume || '';
  }, [resolvedCounty, formData.localitate, localities]);

  const filteredLocalities = useMemo(() => {
    const query = normalize(cityQuery);
    if (!query) return localities;
    return localities.filter((loc) => normalize(loc.nume).includes(query));
  }, [localities, cityQuery]);

  const countyHasMatch = !formData.judet || Boolean(resolvedCounty);
  const showCountyMatchError = showValidation && !countyHasMatch;
  const showCountyRequiredError = isInvalid('judet');
  const showCountyError = showCountyMatchError || showCountyRequiredError;

  const localityHasMatch = !formData.localitate || Boolean(resolvedLocality);
  const showLocalityMatchError = showValidation && Boolean(resolvedCounty) && !localityHasMatch;
  const localityDisabled = !resolvedCounty;
  const showLocalityRequiredError = Boolean(resolvedCounty) && isInvalid('localitate');
  const showLocalityError = showLocalityMatchError || showLocalityRequiredError;
  useFocusFirstInvalid({ enabled: showValidation, attempt: validationAttempt });

  const descriptionLength = formData.descriere ? formData.descriere.length : 0;
  const hasDescriptionLimits = typeof descriptionMin === 'number' || typeof descriptionMax === 'number';
  const descriptionRangeLabel =
    typeof descriptionMin === 'number' && typeof descriptionMax === 'number'
      ? `Intre ${descriptionMin} si ${descriptionMax} de`
      : typeof descriptionMin === 'number'
        ? `Minim ${descriptionMin}`
        : typeof descriptionMax === 'number'
          ? `Maxim ${descriptionMax}`
          : '';

  const liveCapacityError =
    capacityTouched && formData.capacitate.trim().length > 0 ? validateCapacity(formData.capacitate) : null;
  const livePhoneError =
    phoneTouched && formData.telefon.trim().length > 0 ? validatePhone(formData.telefon) : null;

  const descriptionMinValue = typeof descriptionMin === 'number' ? descriptionMin : 0;
  const descriptionMaxValue = typeof descriptionMax === 'number' ? descriptionMax : Number.MAX_SAFE_INTEGER;
  const liveDescriptionError =
    descriptionTouched && descriptionRequired && hasDescriptionLimits
      ? validateDescriptionLength(formData.descriere, descriptionMinValue, descriptionMaxValue)
      : null;

  const capacityInvalid = isInvalid('capacitate') || Boolean(liveCapacityError);
  const phoneInvalid = isInvalid('telefon') || Boolean(livePhoneError);
  const descriptionInvalid = isInvalid('descriere') || Boolean(liveDescriptionError);

  return (
    <>
      <ListingFormSection step="pas 1" label="Detalii principale" title="Identitate și contact" mobileFlat>
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
          {isInvalid('titlu') && (
            <FormMessage inline variant="error">
              Camp obligatoriu.
            </FormMessage>
          )}
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={labelClass(showCountyError)}>
            <span className="text-sm font-medium">Județ</span>
            <Combobox
              value={formData.judet}
              onChange={(value) => {
                if (!value) return;
                onChange('judet', value);
                onChange('localitate', '');
                onChange('sat', '');
                setCountyQuery('');
                setCityQuery('');
              }}
            >
              <div className="relative mt-1 w-full">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <Combobox.Input
                  className={`${inputClass(showCountyError)} w-full pl-10`}
                  displayValue={(value: string) => value}
                  onChange={(event) => {
                    const next = event.target.value;
                    setCountyQuery(next);
                    onChange('judet', next);
                    onChange('localitate', '');
                    onChange('sat', '');
                    setCityQuery('');
                  }}
                  onBlur={() => {
                    if (resolvedCounty && formData.judet !== resolvedCounty) {
                      onChange('judet', resolvedCounty);
                    }
                  }}
                  autoComplete="off"
                  placeholder="Caută județ"
                  aria-invalid={showCountyError}
                />
                <Combobox.Options className="absolute left-0 right-0 z-20 mt-2 max-h-64 w-full box-border overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  {filteredCounties.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      Nu am găsit județe.
                    </div>
                  )}
                  {filteredCounties.map((county) => (
                    <Combobox.Option
                      key={county}
                      value={county}
                      className={({ active }) =>
                        `cursor-pointer px-3 py-2 text-sm ${
                          active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                            : 'text-gray-700 dark:text-gray-200'
                        }`
                      }
                    >
                      {county}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </div>
            </Combobox>
            {showCountyMatchError && (
              <FormMessage inline variant="error">
                Selectează un județ din listă.
              </FormMessage>
            )}
            {showCountyRequiredError && (
              <FormMessage inline variant="error">
                Camp obligatoriu.
              </FormMessage>
            )}
            {locationsError && (
              <FormMessage inline variant="error">
                {locationsError}
              </FormMessage>
            )}
          </div>

          <div className={labelClass(showLocalityError)}>
            <span className="text-sm font-medium">Localitate</span>
            <Combobox
              value={formData.localitate}
              onChange={(value) => {
                if (!value) return;
                onChange('localitate', value);
                onChange('sat', '');
                setCityQuery('');
              }}
              disabled={localityDisabled}
            >
              <div className="relative mt-1 w-full">
                <Combobox.Input
                  className={`${inputClass(showLocalityError)} w-full text-base sm:text-sm ${
                    localityDisabled
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-gray-500'
                      : ''
                  }`}
                  displayValue={(value: string) => value}
                  onChange={(event) => {
                    const next = event.target.value;
                    setCityQuery(next);
                    onChange('localitate', next);
                    onChange('sat', '');
                  }}
                  onBlur={() => {
                    if (resolvedLocality && formData.localitate !== resolvedLocality) {
                      onChange('localitate', resolvedLocality);
                    }
                  }}
                  autoComplete="off"
                  placeholder={resolvedCounty ? 'Caută localitate' : 'Selectati mai intai judetul'}
                  aria-invalid={showLocalityError}
                  aria-disabled={localityDisabled}
                  disabled={localityDisabled}
                />
                {resolvedCounty && (
                  <Combobox.Options className="absolute left-0 right-0 z-20 mt-2 max-h-56 w-full box-border overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg sm:max-h-64 dark:border-zinc-800 dark:bg-zinc-900">
                    {filteredLocalities.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                        Nu am găsit localități.
                      </div>
                    )}
                    {filteredLocalities.map((loc) => (
                      <Combobox.Option
                        key={`${loc.nume}-${resolvedCounty}`}
                        value={loc.nume}
                        className={({ active }) =>
                          `cursor-pointer px-3 py-2 text-sm ${
                            active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                              : 'text-gray-700 dark:text-gray-200'
                          }`
                        }
                      >
                        {loc.nume}
                      </Combobox.Option>
                    ))}
                  </Combobox.Options>
                )}
              </div>
            </Combobox>
            {localityDisabled && (
              <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Selectati mai intai judetul.
              </span>
            )}
            {showLocalityMatchError && (
              <FormMessage inline variant="error">
                Selecteaza o localitate din lista.
              </FormMessage>
            )}
            {showLocalityRequiredError && (
              <FormMessage inline variant="error">
                Camp obligatoriu.
              </FormMessage>
            )}
          </div>

          <label className={labelClass(isInvalid('sat'))}>
            <span className="text-sm font-medium">
              Sat <span className="text-gray-500 dark:text-gray-400">(optional)</span>
            </span>
            <input
              value={formData.sat}
              onChange={(e) => onChange('sat', e.target.value)}
              autoComplete="off"
              className={`${inputClass(isInvalid('sat'))} w-full`}
              aria-invalid={isInvalid('sat')}
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
            {isInvalid('pret') && (
              <FormMessage inline variant="error">
                Camp obligatoriu.
              </FormMessage>
            )}
          </label>
          <label className={labelClass(capacityInvalid)}>
            <span className="text-sm font-medium">Capacitate (pers.)</span>
            <input
              value={formData.capacitate}
              onChange={(e) => onChange('capacitate', e.target.value)}
              onBlur={() => setCapacityTouched(true)}
              type="text"
              inputMode="text"
              required
              placeholder="Ex: 2-4, 2/4, 4+"
              className={inputClass(capacityInvalid)}
              aria-invalid={capacityInvalid}
            />
            {liveCapacityError && (
              <FormMessage inline variant="error">
                {liveCapacityError}
              </FormMessage>
            )}
            {!liveCapacityError && isInvalid('capacitate') && (
              <FormMessage inline variant="error">
                Camp obligatoriu.
              </FormMessage>
            )}
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className={labelClass(isInvalid('camere'))}>
            <span className="text-sm font-medium">Numar camere</span>
            <input
              value={formData.camere}
              onChange={(e) => onChange('camere', e.target.value)}
              type="number"
              inputMode="numeric"
              min={0}
              className={inputClass(isInvalid('camere'))}
              aria-invalid={isInvalid('camere')}
            />
          </label>
          <label className={labelClass(isInvalid('paturi'))}>
            <span className="text-sm font-medium">Numar paturi</span>
            <input
              value={formData.paturi}
              onChange={(e) => onChange('paturi', e.target.value)}
              type="number"
              inputMode="numeric"
              min={0}
              className={inputClass(isInvalid('paturi'))}
              aria-invalid={isInvalid('paturi')}
            />
          </label>
          <label className={labelClass(isInvalid('bai'))}>
            <span className="text-sm font-medium">Numar bai</span>
            <input
              value={formData.bai}
              onChange={(e) => onChange('bai', e.target.value)}
              type="number"
              inputMode="numeric"
              min={0}
              className={inputClass(isInvalid('bai'))}
              aria-invalid={isInvalid('bai')}
            />
          </label>
        </div>

        <label className={labelClass(phoneInvalid)}>
          <span className="text-sm font-medium">Telefon</span>
          <input
            value={formData.telefon}
            onChange={(e) => onChange('telefon', e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            required
            inputMode="tel"
            autoComplete="tel"
            className={inputClass(phoneInvalid)}
            aria-invalid={phoneInvalid}
          />
          {livePhoneError && (
            <FormMessage inline variant="error">
              {livePhoneError}
            </FormMessage>
          )}
          {!livePhoneError && isInvalid('telefon') && (
            <FormMessage inline variant="error">
              Camp obligatoriu.
            </FormMessage>
          )}
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
            <option value="cabana">Cabană autentică</option>
            <option value="a-frame">A-Frame</option>
            <option value="pensiune">Pensiune</option>
            <option value="apartament">Apartament</option>
            <option value="tiny house">Tiny house</option>
            <option value="casa de vacanta">Casă de vacanță</option>
          </select>
        </label>

        <label className={labelClass(descriptionInvalid)}>
          <span className="text-sm font-medium">Descriere</span>
          <textarea
            value={formData.descriere}
            onChange={(e) => onChange('descriere', e.target.value)}
            onBlur={() => setDescriptionTouched(true)}
            className={inputClass(descriptionInvalid)}
            rows={4}
            aria-invalid={descriptionInvalid}
            maxLength={typeof descriptionMax === 'number' ? descriptionMax : undefined}
          />
          {liveDescriptionError && (
            <FormMessage inline variant="error">
              {liveDescriptionError}
            </FormMessage>
          )}
          {!liveDescriptionError && isInvalid('descriere') && (
            <FormMessage inline variant="error">
              Completeaza descrierea conform limitelor cerute.
            </FormMessage>
          )}
          {hasDescriptionLimits && (
            <span className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              {descriptionRangeLabel} caractere. {descriptionLength}
              {typeof descriptionMax === 'number' ? `/${descriptionMax}` : ''}
            </span>
          )}
        </label>

        <FacilitiesPicker facilities={facilities} selected={selectedFacilities} onToggle={onToggleFacility} />
      </ListingFormSection>

      <ListingFormSection step="pas 2" label="Localizare" title="Locație pe hartă" mobileFlat>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Selectează poziția aproximativă. Poți da click pe hartă sau trage pinul, apoi confirmă locația.
        </p>
        <LocationPicker
          onLocationSelect={onLocationSelect}
          onConfirmChange={onLocationConfirmChange}
          initialCounty={initialCounty}
          initialCity={initialCity}
          geocodeCounty={resolvedCounty || ''}
          geocodeCity={resolvedCounty ? resolvedLocality : ''}
          initialLat={initialLat}
          initialLng={initialLng}
          autoLocate={autoLocate}
        />
      </ListingFormSection>

      <ListingFormSection step="pas 3" label="Galerie" title="Ordine imagini" mobileFlat>
        <ImageUploader
          dropzoneTitle={dropzoneTitle}
          dropzoneSubtitle={dropzoneSubtitle}
          dropzoneHelper={dropzoneHelper}
          maxAllowed={maxImagesWarning}
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
