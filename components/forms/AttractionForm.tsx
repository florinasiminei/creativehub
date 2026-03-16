'use client';

import useFocusFirstInvalid from '@/hooks/useFocusFirstInvalid';
import AttractionFormDetailsSection from '@/components/forms/AttractionFormDetailsSection';
import AttractionFormGallerySection from '@/components/forms/AttractionFormGallerySection';
import AttractionFormLocationSection from '@/components/forms/AttractionFormLocationSection';
import type {
  AttractionFormFields,
  AttractionImage,
  AttractionLocationData,
} from '@/lib/attractions/attractionForm';

type LocalityOption = {
  nume: string;
};

type AttractionFormProps = {
  formData: AttractionFormFields;
  onChange: (key: keyof AttractionFormFields, value: string) => void;
  useGeolocation: boolean;
  onUseGeolocationChange: (enabled: boolean) => void;
  locationData: AttractionLocationData | null;
  onLocationSelect: (location: AttractionLocationData) => void;
  onLocationConfirmChange: (confirmed: boolean) => void;
  locationsError: string | null;
  filteredCounties: string[];
  filteredLocalities: LocalityOption[];
  resolvedCounty: string;
  resolvedLocality: string;
  countyHasMatch: boolean;
  localityHasMatch: boolean;
  setCountyQuery: (value: string) => void;
  setCityQuery: (value: string) => void;
  showValidation: boolean;
  validationAttempt: number;
  files: File[];
  previews: string[];
  draggingIdx: number | null;
  isDropActive: boolean;
  onDropActiveChange: (active: boolean) => void;
  onFilesSelected: (files: File[]) => void;
  onDragStart: (idx: number) => void;
  onDragOver: (idx: number) => void;
  onDragEnd: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: (idx: number) => void;
  selectedFailedNames?: string[];
  existingImages?: AttractionImage[];
  existingDraggingIdx?: number | null;
  onExistingDragStart?: (idx: number) => void;
  onExistingDragOver?: (idx: number) => void;
  onExistingDragEnd?: () => void;
  onExistingMove?: (from: number, to: number) => void;
  onExistingDelete?: (image: AttractionImage) => void;
};

export default function AttractionForm({
  formData,
  onChange,
  useGeolocation,
  onUseGeolocationChange,
  locationData,
  onLocationSelect,
  onLocationConfirmChange,
  locationsError,
  filteredCounties,
  filteredLocalities,
  resolvedCounty,
  resolvedLocality,
  countyHasMatch,
  localityHasMatch,
  setCountyQuery,
  setCityQuery,
  showValidation,
  validationAttempt,
  files,
  previews,
  draggingIdx,
  isDropActive,
  onDropActiveChange,
  onFilesSelected,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMove,
  onRemove,
  selectedFailedNames = [],
  existingImages = [],
  existingDraggingIdx,
  onExistingDragStart,
  onExistingDragOver,
  onExistingDragEnd,
  onExistingMove,
  onExistingDelete,
}: AttractionFormProps) {
  const titleInvalid = showValidation && !formData.title.trim();
  const showCountyMatchError = showValidation && !countyHasMatch;
  const showLocalityMatchError = showValidation && Boolean(resolvedCounty) && !localityHasMatch;
  const localityDisabled = !resolvedCounty;

  useFocusFirstInvalid({ enabled: showValidation, attempt: validationAttempt });

  return (
    <>
      <AttractionFormDetailsSection
        formData={formData}
        onChange={onChange}
        useGeolocation={useGeolocation}
        onUseGeolocationChange={onUseGeolocationChange}
        titleInvalid={titleInvalid}
        showCountyMatchError={showCountyMatchError}
        showLocalityMatchError={showLocalityMatchError}
        filteredCounties={filteredCounties}
        filteredLocalities={filteredLocalities}
        resolvedCounty={resolvedCounty}
        resolvedLocality={resolvedLocality}
        localityDisabled={localityDisabled}
        locationsError={locationsError}
        setCountyQuery={setCountyQuery}
        setCityQuery={setCityQuery}
      />

      <AttractionFormLocationSection
        visible={useGeolocation}
        step="pas 2"
        judet={formData.judet}
        localitate={formData.localitate}
        resolvedCounty={resolvedCounty}
        resolvedLocality={resolvedLocality}
        locationData={locationData}
        onChangeCounty={(value) => onChange('judet', value)}
        onChangeLocality={(value) => onChange('localitate', value)}
        onLocationSelect={onLocationSelect}
        onConfirmChange={onLocationConfirmChange}
      />

      <AttractionFormGallerySection
        step={useGeolocation ? 'pas 3' : 'pas 2'}
        showValidation={showValidation}
        files={files}
        previews={previews}
        draggingIdx={draggingIdx}
        isDropActive={isDropActive}
        onDropActiveChange={onDropActiveChange}
        onFilesSelected={onFilesSelected}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onMove={onMove}
        onRemove={onRemove}
        selectedFailedNames={selectedFailedNames}
        existingImages={existingImages}
        existingDraggingIdx={existingDraggingIdx}
        onExistingDragStart={onExistingDragStart}
        onExistingDragOver={onExistingDragOver}
        onExistingDragEnd={onExistingDragEnd}
        onExistingMove={onExistingMove}
        onExistingDelete={onExistingDelete}
      />
    </>
  );
}
