import type {
  ExistingImage,
  FacilityOption,
  ListingFormFields,
  LocationData,
} from "@/lib/listings/listingForm";

export type {
  ExistingImage,
  FacilityOption,
  ListingFormFields,
  LocationData,
};

export type ListingFormProps = {
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
  selectedImagesLocked?: boolean;
  galleryOrder?: string[];
  pendingImageIds?: string[];
  onMoveGalleryToken?: (token: string, direction: -1 | 1) => void;
  onReorderGalleryToken?: (token: string, toIndex: number) => void;
  onDeleteGalleryToken?: (token: string) => void;
  selectedImagesTitle: string;
  selectedImagesSubtitle: string;
  selectedFailedNames?: string[];
  existingImages?: ExistingImage[];
  existingTitle?: string;
  existingSubtitle?: string;
  existingDraggingIdx?: number | null;
  onExistingDragStart?: (idx: number) => void;
  onExistingDragOver?: (idx: number) => void;
  onExistingDragEnd?: () => void;
  onExistingMove?: (from: number, to: number) => void;
  onExistingDelete?: (img: ExistingImage) => void;
  maxImagesWarning?: number;
  descriptionMin?: number;
  descriptionMax?: number;
  descriptionRequired?: boolean;
};
