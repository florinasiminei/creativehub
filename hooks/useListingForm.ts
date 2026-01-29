import { validateRequired, validatePhone, validateImagesCount, validateDescriptionLength } from '@/lib/validation/listing';

type RequiredField = { key: string; value: string | null | undefined; label: string };

type UseListingFormOptions = {
  requiredFields: RequiredField[];
  phone: string;
  phoneKey?: string;
  imagesCount: number;
  minImages: number;
  maxImages: number;
  description?: string;
  descriptionKey?: string;
  descriptionMin?: number;
  descriptionMax?: number;
  enforceDescription?: boolean;
};

export default function useListingForm({
  requiredFields,
  phone,
  phoneKey = 'telefon',
  imagesCount,
  minImages,
  maxImages,
  description = '',
  descriptionKey = 'descriere',
  descriptionMin = 0,
  descriptionMax = 0,
  enforceDescription = false,
}: UseListingFormOptions) {
  const missingKeys = requiredFields
    .filter((f) => !(f.value ?? '').trim())
    .map((f) => f.key);
  const requiredError = validateRequired(requiredFields);
  const phoneError = validatePhone(phone);
  const imagesError = validateImagesCount(imagesCount, minImages, maxImages);
  const descriptionError = enforceDescription
    ? validateDescriptionLength(description, descriptionMin, descriptionMax)
    : null;

  const firstError = requiredError || phoneError || descriptionError || imagesError;
  const invalidFields = [
    ...missingKeys,
    ...(phoneError ? [phoneKey] : []),
    ...(descriptionError ? [descriptionKey] : []),
  ];

  return { error: firstError, invalidFields, imagesInvalid: Boolean(imagesError) };
}
