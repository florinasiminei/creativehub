'use client';

import { Combobox } from '@headlessui/react';
import FormMessage from '@/components/forms/FormMessage';
import ListingFormSection from '@/components/forms/ListingFormSection';
import type { AttractionFormFields } from '@/lib/attractions/attractionForm';

type LocalityOption = {
  nume: string;
};

type AttractionFormDetailsSectionProps = {
  formData: AttractionFormFields;
  onChange: (key: keyof AttractionFormFields, value: string) => void;
  useGeolocation: boolean;
  onUseGeolocationChange: (enabled: boolean) => void;
  titleInvalid: boolean;
  showCountyMatchError: boolean;
  showLocalityMatchError: boolean;
  filteredCounties: string[];
  filteredLocalities: LocalityOption[];
  resolvedCounty: string;
  resolvedLocality: string;
  localityDisabled: boolean;
  locationsError: string | null;
  setCountyQuery: (value: string) => void;
  setCityQuery: (value: string) => void;
};

function inputClass(invalid: boolean) {
  return `mt-1 rounded-lg border px-3 py-2 focus:ring-2 bg-white text-gray-900 placeholder:text-gray-400 ${
    invalid
      ? 'border-red-400 bg-red-50 focus:ring-red-500 dark:border-red-500 dark:bg-red-950/40'
      : 'border-gray-200 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900'
  } dark:text-gray-100 dark:placeholder:text-gray-500`;
}

export default function AttractionFormDetailsSection({
  formData,
  onChange,
  useGeolocation,
  onUseGeolocationChange,
  titleInvalid,
  showCountyMatchError,
  showLocalityMatchError,
  filteredCounties,
  filteredLocalities,
  resolvedCounty,
  resolvedLocality,
  localityDisabled,
  locationsError,
  setCountyQuery,
  setCityQuery,
}: AttractionFormDetailsSectionProps) {
  return (
    <ListingFormSection step="pas 1" label="Detalii" title="Informatii principale">
      <div className="grid grid-cols-1 gap-4">
        <label
          className={`flex flex-col ${
            titleInvalid ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          <span className="text-sm font-medium">Nume atractie *</span>
          <input
            value={formData.title}
            onChange={(event) => onChange('title', event.target.value)}
            maxLength={120}
            required
            className={inputClass(titleInvalid)}
            aria-invalid={titleInvalid}
          />
          {titleInvalid && (
            <FormMessage inline variant="error">
              Camp obligatoriu.
            </FormMessage>
          )}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          className={`flex flex-col ${
            showCountyMatchError ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          <span className="text-sm font-medium">
            Judet <span className="text-gray-500 dark:text-gray-400">(optional)</span>
          </span>
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
                className={`${inputClass(showCountyMatchError)} w-full pl-10`}
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
                placeholder="Cauta judet"
                aria-invalid={showCountyMatchError}
              />
              <Combobox.Options className="absolute left-0 right-0 z-20 mt-2 max-h-64 w-full box-border overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                {filteredCounties.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Nu am gasit judete.</div>
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
              Selecteaza un judet din lista.
            </FormMessage>
          )}
          {locationsError && (
            <FormMessage inline variant="error">
              {locationsError}
            </FormMessage>
          )}
        </div>

        <div
          className={`flex flex-col ${
            showLocalityMatchError ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          <span className="text-sm font-medium">
            Localitate <span className="text-gray-500 dark:text-gray-400">(optional)</span>
          </span>
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
                className={`${inputClass(showLocalityMatchError)} w-full text-base sm:text-sm ${
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
                placeholder={resolvedCounty ? 'Cauta localitate' : 'Selecteaza mai intai judetul'}
                aria-invalid={showLocalityMatchError}
                aria-disabled={localityDisabled}
                disabled={localityDisabled}
              />
              {resolvedCounty && (
                <Combobox.Options className="absolute left-0 right-0 z-20 mt-2 max-h-56 w-full box-border overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg sm:max-h-64 dark:border-zinc-800 dark:bg-zinc-900">
                  {filteredLocalities.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      Nu am gasit localitati.
                    </div>
                  )}
                  {filteredLocalities.map((locality) => (
                    <Combobox.Option
                      key={`${locality.nume}-${resolvedCounty}`}
                      value={locality.nume}
                      className={({ active }) =>
                        `cursor-pointer px-3 py-2 text-sm ${
                          active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                            : 'text-gray-700 dark:text-gray-200'
                        }`
                      }
                    >
                      {locality.nume}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              )}
            </div>
          </Combobox>
          {localityDisabled && (
            <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">Selecteaza mai intai judetul.</span>
          )}
          {showLocalityMatchError && (
            <FormMessage inline variant="error">
              Selecteaza o localitate din lista.
            </FormMessage>
          )}
        </div>

        <label className="flex flex-col text-gray-900 dark:text-gray-100">
          <span className="text-sm font-medium">
            Sat <span className="text-gray-500 dark:text-gray-400">(optional)</span>
          </span>
          <input
            value={formData.sat}
            onChange={(event) => onChange('sat', event.target.value)}
            autoComplete="off"
            className={inputClass(false)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col text-gray-900 dark:text-gray-100">
          <span className="text-sm font-medium">Pret (optional)</span>
          <input
            value={formData.price}
            onChange={(event) => onChange('price', event.target.value)}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="Ex: 25"
            className={inputClass(false)}
          />
        </label>

        <label className="flex items-center gap-2 self-end rounded-lg border border-gray-200 px-3 py-2 dark:border-zinc-800">
          <input
            type="checkbox"
            checked={useGeolocation}
            onChange={(event) => onUseGeolocationChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">Adauga geolocatie (optional)</span>
        </label>
      </div>

      <label className="flex flex-col text-gray-900 dark:text-gray-100">
        <span className="text-sm font-medium">Descriere (optional)</span>
        <textarea
          value={formData.description}
          onChange={(event) => onChange('description', event.target.value)}
          rows={4}
          maxLength={1200}
          className={inputClass(false)}
          placeholder="Detalii utile pentru vizitatori"
        />
      </label>
    </ListingFormSection>
  );
}
