import { LISTING_TYPES } from "@/lib/listingTypes";
import type { ListingFormFields, LocationData } from "@/lib/listings/listingForm";
import {
  validateCapacity,
  validateDescriptionLength,
  validatePhone,
} from "@/lib/validation/listing";

export const LISTING_SUBMISSION_LIMITS = {
  titleMaxLength: 90,
  descriptionMinLength: 200,
  descriptionMaxLength: 1000,
  minImages: 5,
  maxImages: 30,
  maxImageBytes: 15 * 1024 * 1024,
} as const;

export const LISTING_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type ListingWizardStepId =
  | "identity"
  | "capacity"
  | "description"
  | "location"
  | "gallery"
  | "review";

export const LISTING_WIZARD_STEP_ORDER: ListingWizardStepId[] = [
  "identity",
  "location",
  "gallery",
  "review",
];

export type ListingStepValidation = {
  error: string | null;
  invalidFields: string[];
  imagesInvalid: boolean;
  locationInvalid: boolean;
  termsInvalid: boolean;
};

export type ListingStepValidationInput = {
  formData: ListingFormFields;
  administrativeLocationValid: boolean;
  locationData: LocationData | null;
  locationConfirmed: boolean;
  imagesCount: number;
  acceptedTerms: boolean;
  requireTerms: boolean;
  requireCompleteProfile: boolean;
};

const allowedListingTypes = new Set<string>(
  LISTING_TYPES.map((listingType) => listingType.value),
);
const allowedImageTypes = new Set<string>(LISTING_IMAGE_MIME_TYPES);

function createValidationResult(): ListingStepValidation {
  return {
    error: null,
    invalidFields: [],
    imagesInvalid: false,
    locationInvalid: false,
    termsInvalid: false,
  };
}

function addFieldError(
  result: ListingStepValidation,
  field: keyof ListingFormFields,
  message: string,
) {
  if (!result.invalidFields.includes(field)) result.invalidFields.push(field);
  if (!result.error) result.error = message;
}

function isNonNegativeInteger(value: string) {
  const normalized = value.trim();
  return /^\d+$/.test(normalized) && Number(normalized) >= 0;
}

function hasValidCoordinates(locationData: LocationData | null) {
  if (!locationData) return false;
  const { latitude, longitude } = locationData;
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    (latitude !== 0 || longitude !== 0)
  );
}

export function validateListingWizardStep(
  step: ListingWizardStepId,
  input: ListingStepValidationInput,
): ListingStepValidation {
  const result = createValidationResult();
  const { formData } = input;

  if (step === "identity") {
    const title = formData.titlu.trim();
    if (!title) {
      addFieldError(result, "titlu", "Completează denumirea proprietății.");
    } else if (title.length > LISTING_SUBMISSION_LIMITS.titleMaxLength) {
      addFieldError(
        result,
        "titlu",
        `Denumirea poate avea maximum ${LISTING_SUBMISSION_LIMITS.titleMaxLength} de caractere.`,
      );
    }

    if (!allowedListingTypes.has(formData.tip)) {
      addFieldError(result, "tip", "Selectează un tip de proprietate valid.");
    }
  }

  if (step === "location") {
    if (!formData.judet.trim()) {
      addFieldError(result, "judet", "Selectează județul.");
    }
    if (!formData.localitate.trim()) {
      addFieldError(result, "localitate", "Selectează localitatea.");
    }
    if (
      formData.judet.trim() &&
      formData.localitate.trim() &&
      !input.administrativeLocationValid
    ) {
      addFieldError(
        result,
        "judet",
        "Selectează județul și localitatea din listele disponibile.",
      );
      if (!result.invalidFields.includes("localitate")) {
        result.invalidFields.push("localitate");
      }
    }
  }

  if (step === "identity" || step === "capacity") {
    const price = Number(formData.pret);
    if (!formData.pret.trim() || !Number.isFinite(price) || price <= 0) {
      addFieldError(result, "pret", "Introdu un preț pe noapte mai mare decât zero.");
    }

    const capacity = formData.capacitate.trim();
    const capacityError = capacity ? validateCapacity(capacity) : "Completează capacitatea.";
    const capacityNumbers = capacity.match(/\d+/g)?.map(Number) || [];
    if (
      capacityError ||
      capacityNumbers.length === 0 ||
      capacityNumbers.some((value) => value <= 0)
    ) {
      addFieldError(
        result,
        "capacitate",
        capacityError || "Capacitatea trebuie să fie mai mare decât zero.",
      );
    }

    (["camere", "paturi", "bai"] as const).forEach((field) => {
      if (!isNonNegativeInteger(formData[field])) {
        addFieldError(
          result,
          field,
          "Camerele, paturile și băile trebuie să fie numere întregi, minimum zero.",
        );
      }
    });
  }

  if (step === "identity" || step === "description") {
    const shouldValidateDescription =
      input.requireCompleteProfile || formData.descriere.trim().length > 0;
    if (shouldValidateDescription) {
      const descriptionError = validateDescriptionLength(
        formData.descriere,
        input.requireCompleteProfile ? LISTING_SUBMISSION_LIMITS.descriptionMinLength : 0,
        LISTING_SUBMISSION_LIMITS.descriptionMaxLength,
      );
      if (descriptionError) addFieldError(result, "descriere", descriptionError);
    }
  }

  if (step === "location") {
    if (!input.locationConfirmed || !hasValidCoordinates(input.locationData)) {
      result.locationInvalid = true;
      if (!result.error) result.error = "Poziționează pinul și confirmă locația proprietății.";
    }
  }

  if (step === "gallery") {
    const minimumImages = input.requireCompleteProfile
      ? LISTING_SUBMISSION_LIMITS.minImages
      : 0;
    if (
      input.imagesCount < minimumImages ||
      input.imagesCount > LISTING_SUBMISSION_LIMITS.maxImages
    ) {
      result.imagesInvalid = true;
      result.error =
        input.imagesCount < minimumImages
          ? `Adaugă cel puțin ${minimumImages} fotografii.`
          : `Poți adăuga cel mult ${LISTING_SUBMISSION_LIMITS.maxImages} fotografii.`;
    }
  }

  if (step === "review") {
    const phone = formData.telefon.trim();
    if (!phone) {
      addFieldError(result, "telefon", "Completează numărul de telefon.");
    } else {
      const phoneError = validatePhone(phone);
      if (phoneError) addFieldError(result, "telefon", phoneError);
    }

    if (input.requireTerms && !input.acceptedTerms) {
      result.termsInvalid = true;
      if (!result.error) result.error = "Acceptă termenii și condițiile pentru a continua.";
    }
  }

  return result;
}

export function findFirstInvalidListingStep(input: ListingStepValidationInput) {
  for (const step of LISTING_WIZARD_STEP_ORDER) {
    const validation = validateListingWizardStep(step, input);
    if (validation.error) return { step, validation };
  }
  return null;
}

export function getListingImageFileError(file: { type: string; size: number }) {
  if (!allowedImageTypes.has(file.type.toLowerCase())) {
    return "Folosește doar imagini JPEG, PNG, WebP sau AVIF.";
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return "Fișierul selectat este gol sau invalid.";
  }
  if (file.size > LISTING_SUBMISSION_LIMITS.maxImageBytes) {
    return "Fiecare imagine poate avea maximum 15 MB.";
  }
  return null;
}
