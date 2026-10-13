import type { ListingWizardStep } from '@/components/forms/ListingWizard';
import {
  createEmptyListingFormFields,
  type ExistingImage as ListingImage,
} from '@/lib/listings/listingForm';
import type { ListingWizardStepId } from '@/lib/listings/listingSubmissionRules';

export type AddPropertyWizardStep = ListingWizardStep & {
  id: ListingWizardStepId;
  formSection: 'identity' | 'capacity' | 'description' | 'location' | 'gallery' | 'contact';
  helperText: string;
};

export type UploadResult = {
  id: string;
  url: string;
  display_order: number;
};

export type AddPropertyForm = ReturnType<typeof createInitialAddPropertyForm>;

export function createInitialAddPropertyForm() {
  return {
    ...createEmptyListingFormFields(),
    honeypot: '',
  };
}

export const WIZARD_STEPS: AddPropertyWizardStep[] = [
  {
    id: 'identity',
    label: 'Proprietate',
    description: 'Prezentare, capacitate și facilități',
    formSection: 'identity',
    helperText: 'Completează detaliile proprietății și selectează facilitățile disponibile.',
  },
  {
    id: 'location',
    label: 'Localizare',
    description: 'Adresă și poziție pe hartă',
    formSection: 'location',
    helperText: 'Confirmă pinul și verifică județul, localitatea și satul precompletate.',
  },
  {
    id: 'gallery',
    label: 'Fotografii',
    description: 'Galerie între 5 și 30 de imagini',
    formSection: 'gallery',
    helperText: 'Prima fotografie va fi imaginea principală a proprietății.',
  },
  {
    id: 'review',
    label: 'Verificare',
    description: 'Contact, acorduri și trimitere',
    formSection: 'contact',
    helperText: 'Verifică rezumatul și contul în care va fi salvată proprietatea, apoi trimite spre verificare.',
  },
];

export function createPendingImageId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function moveToken(tokens: string[], fromIndex: number, toIndex: number) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= tokens.length ||
    toIndex >= tokens.length
  ) {
    return tokens;
  }

  const next = [...tokens];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function mapUploadedImages(
  uploaded: UploadResult[],
  previewUrls: string[] = [],
): ListingImage[] {
  return uploaded.map((item, index) => ({
    id: item.id,
    image_url: item.url,
    alt: null,
    preview_url: previewUrls[index] || null,
  }));
}
