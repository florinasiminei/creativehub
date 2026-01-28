import { validateRequired, validatePhone, validateImagesCount } from '@/lib/validation/listing';

type RequiredField = { value: string; label: string };

type UseListingFormOptions = {
  requiredFields: RequiredField[];
  phone: string;
  imagesCount: number;
  minImages: number;
  maxImages: number;
};

export default function useListingForm({ requiredFields, phone, imagesCount, minImages, maxImages }: UseListingFormOptions) {
  const requiredError = validateRequired(requiredFields);
  const phoneError = validatePhone(phone);
  const imagesError = validateImagesCount(imagesCount, minImages, maxImages);

  const firstError = requiredError || phoneError || imagesError;

  return { error: firstError };
}
