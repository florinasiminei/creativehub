"use client";

import { useEffect } from "react";
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
  activeSection = "all",
  formData,
  onChange,
  facilities,
  selectedFacilities,
  onToggleFacility,
  onLocationSelect,
  onLocationConfirmChange,
  onAdministrativeLocationValidityChange,
  autoLocate = true,
  initialCounty,
  initialCity,
  initialLat = null,
  initialLng = null,
  initialLocationConfirmed = false,
  dropzoneTitle = "Incarca imagini",
  dropzoneSubtitle = "Acceptă .jpg, .png, .webp sau .avif",
  dropzoneHelper = "Click pentru a selecta",
  showValidation = false,
  invalidFields = [],
  imagesInvalid = false,
  imagesError = null,
  locationInvalid = false,
  minimumImagesRequired = 0,
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
  galleryOrder,
  pendingImageIds,
  onMoveGalleryToken,
  onReorderGalleryToken,
  onDeleteGalleryToken,
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
    locationsReady,
    locationsError,
    filteredCounties,
    filteredLocalities,
    resolvedCounty,
    resolvedLocality,
    countyHasMatch,
    localityHasMatch,
    setCountyQuery,
    setCityQuery,
    resolveAdministrativeLocation,
  } = useCountyLocalityData(formData.judet, formData.localitate);

  useFocusFirstInvalid({ enabled: showValidation, attempt: validationAttempt });

  useEffect(() => {
    if (!locationsReady && !locationsError) return;

    onAdministrativeLocationValidityChange?.(
      Boolean(resolvedCounty && resolvedLocality && countyHasMatch && localityHasMatch),
    );
  }, [
    countyHasMatch,
    localityHasMatch,
    locationsError,
    locationsReady,
    onAdministrativeLocationValidityChange,
    resolvedCounty,
    resolvedLocality,
  ]);

  const showAllSections = activeSection === "all";
  const detailsSection =
    activeSection === "all" ||
    activeSection === "identity" ||
    activeSection === "capacity" ||
    activeSection === "description" ||
    activeSection === "contact"
      ? activeSection
      : null;

  const details = (
    <ListingFormDetailsSection
      section={detailsSection || "location"}
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
  );

  return (
    <>
      {detailsSection && details}

      {(showAllSections || activeSection === "location") && (
        <ListingFormLocationSection
          onLocationSelect={(location) => onLocationSelect({
            ...location,
            ...resolveAdministrativeLocation(location.county, location.city),
          })}
          onLocationConfirmChange={onLocationConfirmChange}
          initialCounty={initialCounty}
          initialCity={initialCity}
          resolvedCounty={resolvedCounty}
          resolvedLocality={resolvedLocality}
          initialLat={initialLat}
          initialLng={initialLng}
          initialConfirmed={initialLocationConfirmed}
          autoLocate={autoLocate}
          stepLabel={showAllSections ? undefined : "pas 2 din 4"}
          wizardStep={!showAllSections}
          showValidation={showValidation}
          locationInvalid={locationInvalid}
        >
          {activeSection === "location" && details}
        </ListingFormLocationSection>
      )}

      {(showAllSections || activeSection === "gallery") && (
        <ListingFormGallerySection
          dropzoneTitle={dropzoneTitle}
          dropzoneSubtitle={dropzoneSubtitle}
          dropzoneHelper={dropzoneHelper}
          showValidation={showValidation}
          imagesInvalid={imagesInvalid}
          imagesError={imagesError}
          minimumImagesRequired={minimumImagesRequired}
          stepLabel={showAllSections ? undefined : "pas 3 din 4"}
          wizardStep={!showAllSections}
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
          galleryOrder={galleryOrder}
          pendingImageIds={pendingImageIds}
          onMoveGalleryToken={onMoveGalleryToken}
          onReorderGalleryToken={onReorderGalleryToken}
          onDeleteGalleryToken={onDeleteGalleryToken}
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
      )}
    </>
  );
}
