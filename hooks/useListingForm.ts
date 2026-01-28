import { validateRequired, validatePhone, validateImagesCount } from '@/lib/validation/listing';

type RequiredField = { key: string; value: string; label: string };

type UseListingFormOptions = {
  requiredFields: RequiredField[];
  phone: string;
  phoneKey?: string;
  imagesCount: number;
  minImages: number;
  maxImages: number;
};

export default function useListingForm({
  requiredFields,
  phone,
  phoneKey = 'telefon',
  imagesCount,
  minImages,
  maxImages,
}: UseListingFormOptions) {
  const missingKeys = requiredFields.filter((f) => !f.value.trim()).map((f) => f.key);
  const requiredError = validateRequired(requiredFields);
  const phoneError = validatePhone(phone);
  const imagesError = validateImagesCount(imagesCount, minImages, maxImages);

  const firstError = requiredError || phoneError || imagesError;
  const invalidFields = [
    ...missingKeys,
    ...(phoneError ? [phoneKey] : []),
  ];

  return { error: firstError, invalidFields, imagesInvalid: Boolean(imagesError) };
}
