"use client";

import ListingFormDetailsSection from "./ListingFormDetailsSection";
import ListingFormGallerySection from "./ListingFormGallerySection";
import ListingFormLocationSection from "./ListingFormLocationSection";
import type { ListingFormProps } from "./listingFormTypes";
import useCountyLocalityData from "@/hooks/useCountyLocalityData";
import useFocusFirstInvalid from "@/hooks/useFocusFirstInvalid";

export type {
  ExistingImage,
  FacilityOption,
  ListingFormFields,
  ListingFormProps as ListingFormComponentProps,
  LocationData,
} from "./listingFormTypes";

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
  dropzoneTitle = "Incarca imagini",
  dropzoneSubtitle = "Accepta .jpg, .png, .webp, .avif, .heic",
  dropzoneHelper = "Click pentru a selecta",
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
  selectedImagesLocked = false,
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
  const {
    locationsError,
    filteredCounties,
    filteredLocalities,
    resolvedCounty,
    resolvedLocality,
    countyHasMatch,
    localityHasMatch,
    setCountyQuery,
    setCityQuery,
  } = useCountyLocalityData(formData.judet, formData.localitate);

  useFocusFirstInvalid({ enabled: showValidation, attempt: validationAttempt });

  return (
    <>
      <ListingFormDetailsSection
        formData={formData}
        onChange={onChange}
        facilities={facilities}
        selectedFacilities={selectedFacilities}
        onToggleFacility={onToggleFacility}
        showValidation={showValidation}
        invalidFields={invalidFields}
        locationsError={locationsError}
        filteredCounties={filteredCounties}
        filteredLocalities={filteredLocalities}
        resolvedCounty={resolvedCounty}
        resolvedLocality={resolvedLocality}
        countyHasMatch={countyHasMatch}
        localityHasMatch={localityHasMatch}
        setCountyQuery={setCountyQuery}
        setCityQuery={setCityQuery}
        descriptionMin={descriptionMin}
        descriptionMax={descriptionMax}
        descriptionRequired={descriptionRequired}
      />

      <ListingFormLocationSection
        onLocationSelect={onLocationSelect}
        onLocationConfirmChange={onLocationConfirmChange}
        initialCounty={initialCounty}
        initialCity={initialCity}
        resolvedCounty={resolvedCounty}
        resolvedLocality={resolvedLocality}
        initialLat={initialLat}
        initialLng={initialLng}
        autoLocate={autoLocate}
      />

      <ListingFormGallerySection
        dropzoneTitle={dropzoneTitle}
        dropzoneSubtitle={dropzoneSubtitle}
        dropzoneHelper={dropzoneHelper}
        showValidation={showValidation}
        imagesInvalid={imagesInvalid}
        isDropActive={isDropActive}
        onDropActiveChange={onDropActiveChange}
        onFilesSelected={onFilesSelected}
        files={files}
        previews={previews}
        draggingIdx={draggingIdx}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onMove={onMove}
        onRemove={onRemove}
        selectedImagesLocked={selectedImagesLocked}
        selectedImagesTitle={selectedImagesTitle}
        selectedImagesSubtitle={selectedImagesSubtitle}
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
        maxImagesWarning={maxImagesWarning}
      />
    </>
  );
}
