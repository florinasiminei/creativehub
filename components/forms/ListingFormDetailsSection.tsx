"use client";

import { useState } from "react";
import { Combobox } from "@headlessui/react";
import FacilitiesPicker from "./FacilitiesPicker";
import FormMessage from "./FormMessage";
import ListingFormSection from "./ListingFormSection";
import type { FacilityOption, ListingFormFields } from "./listingFormTypes";
import { validateCapacity, validateDescriptionLength, validatePhone } from "@/lib/validation/listing";

type LocalityOption = { nume: string };

type ListingFormDetailsSectionProps = {
  formData: ListingFormFields;
  onChange: (key: keyof ListingFormFields, value: string) => void;
  facilities: FacilityOption[];
  selectedFacilities: string[];
  onToggleFacility: (id: string) => void;
  showValidation: boolean;
  invalidFields: string[];
  locationsError: string | null;
  filteredCounties: string[];
  filteredLocalities: LocalityOption[];
  resolvedCounty: string;
  resolvedLocality: string;
  countyHasMatch: boolean;
  localityHasMatch: boolean;
  setCountyQuery: (value: string) => void;
  setCityQuery: (value: string) => void;
  descriptionMin?: number;
  descriptionMax?: number;
  descriptionRequired?: boolean;
};

export default function ListingFormDetailsSection({
  formData,
  onChange,
  facilities,
  selectedFacilities,
  onToggleFacility,
  showValidation,
  invalidFields,
  locationsError,
  filteredCounties,
  filteredLocalities,
  resolvedCounty,
  resolvedLocality,
  countyHasMatch,
  localityHasMatch,
  setCountyQuery,
  setCityQuery,
  descriptionMin,
  descriptionMax,
  descriptionRequired = false,
}: ListingFormDetailsSectionProps) {
  const [capacityTouched, setCapacityTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  const isInvalid = (key: string) => showValidation && invalidFields.includes(key);
  const inputClass = (invalid: boolean) =>
    `mt-1 w-full rounded-2xl border px-4 py-3 text-gray-900 shadow-sm transition focus:ring-2 ${
      invalid
        ? "border-red-300 bg-red-50 focus:ring-red-500 dark:border-red-500 dark:bg-red-950/40"
        : "border-gray-200 bg-white focus:border-emerald-300 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
    } dark:text-gray-100`;
  const labelClass = (invalid: boolean) =>
    `flex flex-col ${invalid ? "text-red-700 dark:text-red-300" : "text-gray-900 dark:text-gray-100"}`;

  const showCountyMatchError = showValidation && !countyHasMatch;
  const showCountyRequiredError = isInvalid("judet");
  const showCountyError = showCountyMatchError || showCountyRequiredError;

  const localityDisabled = !resolvedCounty;
  const showLocalityMatchError = showValidation && Boolean(resolvedCounty) && !localityHasMatch;
  const showLocalityRequiredError = Boolean(resolvedCounty) && isInvalid("localitate");
  const showLocalityError = showLocalityMatchError || showLocalityRequiredError;

  const descriptionLength = formData.descriere ? formData.descriere.length : 0;
  const hasDescriptionLimits = typeof descriptionMin === "number" || typeof descriptionMax === "number";
  const descriptionRangeLabel =
    typeof descriptionMin === "number" && typeof descriptionMax === "number"
      ? `Intre ${descriptionMin} si ${descriptionMax} de`
      : typeof descriptionMin === "number"
        ? `Minim ${descriptionMin}`
        : typeof descriptionMax === "number"
          ? `Maxim ${descriptionMax}`
          : "";

  const liveCapacityError =
    capacityTouched && formData.capacitate.trim().length > 0 ? validateCapacity(formData.capacitate) : null;
  const livePhoneError =
    phoneTouched && formData.telefon.trim().length > 0 ? validatePhone(formData.telefon) : null;

  const descriptionMinValue = typeof descriptionMin === "number" ? descriptionMin : 0;
  const descriptionMaxValue = typeof descriptionMax === "number" ? descriptionMax : Number.MAX_SAFE_INTEGER;
  const liveDescriptionError =
    descriptionTouched && descriptionRequired && hasDescriptionLimits
      ? validateDescriptionLength(formData.descriere, descriptionMinValue, descriptionMaxValue)
      : null;

  const capacityInvalid = isInvalid("capacitate") || Boolean(liveCapacityError);
  const phoneInvalid = isInvalid("telefon") || Boolean(livePhoneError);
  const descriptionInvalid = isInvalid("descriere") || Boolean(liveDescriptionError);

  return (
    <ListingFormSection step="pas 1" label="Detalii principale" title="Identitate si contact" mobileFlat>
      <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
        Completeaza profilul proprietatii cat mai clar. Titlul, locatia si descrierea sunt elementele care
        influenteaza cel mai mult aprobarea si prezentarea finala.
      </div>

      <label className={labelClass(isInvalid("titlu"))}>
        <span className="text-sm font-medium">Titlu</span>
        <input
          value={formData.titlu}
          onChange={(event) => onChange("titlu", event.target.value)}
          required
          autoComplete="off"
          maxLength={90}
          className={inputClass(isInvalid("titlu"))}
          aria-invalid={isInvalid("titlu")}
        />
        {isInvalid("titlu") && (
          <FormMessage inline variant="error">
            Camp obligatoriu.
          </FormMessage>
        )}
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={labelClass(showCountyError)}>
          <span className="text-sm font-medium">Judet</span>
          <Combobox
            value={formData.judet}
            onChange={(value) => {
              if (!value) return;
              onChange("judet", value);
              onChange("localitate", "");
              onChange("sat", "");
              setCountyQuery("");
              setCityQuery("");
            }}
          >
            <div className="relative mt-1 w-full">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
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
                className={`${inputClass(showCountyError)} pl-11`}
                displayValue={(value: string) => value}
                onChange={(event) => {
                  const next = event.target.value;
                  setCountyQuery(next);
                  onChange("judet", next);
                  onChange("localitate", "");
                  onChange("sat", "");
                  setCityQuery("");
                }}
                onBlur={() => {
                  if (resolvedCounty && formData.judet !== resolvedCounty) {
                    onChange("judet", resolvedCounty);
                  }
                }}
                autoComplete="off"
                placeholder="Cauta judet"
                aria-invalid={showCountyError}
              />
              <Combobox.Options className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                {filteredCounties.length === 0 && (
                  <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">Nu am gasit judete.</div>
                )}
                {filteredCounties.map((county) => (
                  <Combobox.Option
                    key={county}
                    value={county}
                    className={({ active }) =>
                      `cursor-pointer px-4 py-2.5 text-sm ${
                        active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                          : "text-gray-700 dark:text-gray-200"
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
              onChange("localitate", value);
              onChange("sat", "");
              setCityQuery("");
            }}
            disabled={localityDisabled}
          >
            <div className="relative mt-1 w-full">
              <Combobox.Input
                className={`${inputClass(showLocalityError)} ${
                  localityDisabled
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-gray-500"
                    : ""
                }`}
                displayValue={(value: string) => value}
                onChange={(event) => {
                  const next = event.target.value;
                  setCityQuery(next);
                  onChange("localitate", next);
                  onChange("sat", "");
                }}
                onBlur={() => {
                  if (resolvedLocality && formData.localitate !== resolvedLocality) {
                    onChange("localitate", resolvedLocality);
                  }
                }}
                autoComplete="off"
                placeholder={resolvedCounty ? "Cauta localitate" : "Selecteaza mai intai judetul"}
                aria-invalid={showLocalityError}
                aria-disabled={localityDisabled}
                disabled={localityDisabled}
              />
              {resolvedCounty && (
                <Combobox.Options className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-2xl border border-gray-200 bg-white shadow-xl sm:max-h-64 dark:border-zinc-800 dark:bg-zinc-900">
                  {filteredLocalities.length === 0 && (
                    <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">Nu am gasit localitati.</div>
                  )}
                  {filteredLocalities.map((locality) => (
                    <Combobox.Option
                      key={`${locality.nume}-${resolvedCounty}`}
                      value={locality.nume}
                      className={({ active }) =>
                        `cursor-pointer px-4 py-2.5 text-sm ${
                          active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                            : "text-gray-700 dark:text-gray-200"
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
          {showLocalityRequiredError && (
            <FormMessage inline variant="error">
              Camp obligatoriu.
            </FormMessage>
          )}
        </div>

        <label className={labelClass(isInvalid("sat"))}>
          <span className="text-sm font-medium">
            Sat <span className="text-gray-500 dark:text-gray-400">(optional)</span>
          </span>
          <input
            value={formData.sat}
            onChange={(event) => onChange("sat", event.target.value)}
            autoComplete="off"
            className={inputClass(isInvalid("sat"))}
            aria-invalid={isInvalid("sat")}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className={labelClass(isInvalid("pret"))}>
          <span className="text-sm font-medium">Pret (lei/noapte)</span>
          <input
            value={formData.pret}
            onChange={(event) => onChange("pret", event.target.value)}
            type="number"
            inputMode="numeric"
            min={0}
            required
            className={inputClass(isInvalid("pret"))}
            aria-invalid={isInvalid("pret")}
          />
          {isInvalid("pret") && (
            <FormMessage inline variant="error">
              Camp obligatoriu.
            </FormMessage>
          )}
        </label>

        <label className={labelClass(capacityInvalid)}>
          <span className="text-sm font-medium">Capacitate (pers.)</span>
          <input
            value={formData.capacitate}
            onChange={(event) => onChange("capacitate", event.target.value)}
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
          {!liveCapacityError && isInvalid("capacitate") && (
            <FormMessage inline variant="error">
              Camp obligatoriu.
            </FormMessage>
          )}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className={labelClass(isInvalid("camere"))}>
          <span className="text-sm font-medium">Numar camere</span>
          <input
            value={formData.camere}
            onChange={(event) => onChange("camere", event.target.value)}
            type="number"
            inputMode="numeric"
            min={0}
            className={inputClass(isInvalid("camere"))}
            aria-invalid={isInvalid("camere")}
          />
        </label>

        <label className={labelClass(isInvalid("paturi"))}>
          <span className="text-sm font-medium">Numar paturi</span>
          <input
            value={formData.paturi}
            onChange={(event) => onChange("paturi", event.target.value)}
            type="number"
            inputMode="numeric"
            min={0}
            className={inputClass(isInvalid("paturi"))}
            aria-invalid={isInvalid("paturi")}
          />
        </label>

        <label className={labelClass(isInvalid("bai"))}>
          <span className="text-sm font-medium">Numar bai</span>
          <input
            value={formData.bai}
            onChange={(event) => onChange("bai", event.target.value)}
            type="number"
            inputMode="numeric"
            min={0}
            className={inputClass(isInvalid("bai"))}
            aria-invalid={isInvalid("bai")}
          />
        </label>
      </div>

      <label className={labelClass(phoneInvalid)}>
        <span className="text-sm font-medium">Telefon</span>
        <input
          value={formData.telefon}
          onChange={(event) => onChange("telefon", event.target.value)}
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
        {!livePhoneError && isInvalid("telefon") && (
          <FormMessage inline variant="error">
            Camp obligatoriu.
          </FormMessage>
        )}
        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">Ex: 07xx xxx xxx sau +40 7xx xxx xxx</span>
      </label>

      <label className={labelClass(isInvalid("tip"))}>
        <span className="text-sm font-medium">Tip</span>
        <select
          value={formData.tip}
          onChange={(event) => onChange("tip", event.target.value)}
          className={inputClass(isInvalid("tip"))}
          aria-invalid={isInvalid("tip")}
        >
          <option value="cabana">Cabana autentica</option>
          <option value="a-frame">A-Frame</option>
          <option value="pensiune">Pensiune</option>
          <option value="apartament">Apartament</option>
          <option value="tiny house">Tiny house</option>
          <option value="casa de vacanta">Casa de vacanta</option>
        </select>
      </label>

      <label className={labelClass(descriptionInvalid)}>
        <span className="text-sm font-medium">Descriere</span>
        <textarea
          value={formData.descriere}
          onChange={(event) => onChange("descriere", event.target.value)}
          onBlur={() => setDescriptionTouched(true)}
          className={inputClass(descriptionInvalid)}
          rows={5}
          aria-invalid={descriptionInvalid}
          maxLength={typeof descriptionMax === "number" ? descriptionMax : undefined}
        />
        {liveDescriptionError && (
          <FormMessage inline variant="error">
            {liveDescriptionError}
          </FormMessage>
        )}
        {!liveDescriptionError && isInvalid("descriere") && (
          <FormMessage inline variant="error">
            Completeaza descrierea conform limitelor cerute.
          </FormMessage>
        )}
        {hasDescriptionLimits && (
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {descriptionRangeLabel} caractere. {descriptionLength}
            {typeof descriptionMax === "number" ? `/${descriptionMax}` : ""}
          </span>
        )}
      </label>

      <FacilitiesPicker facilities={facilities} selected={selectedFacilities} onToggle={onToggleFacility} />
    </ListingFormSection>
  );
}
