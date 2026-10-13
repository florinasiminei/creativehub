'use client';

import { FormEvent, useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import ClientListingConsentPanel from '@/components/forms/ClientListingConsentPanel';
import ListingForm from '@/components/forms/ListingForm';
import ListingSubmitFeedback from '@/components/forms/ListingSubmitFeedback';
import {
  ListingWizardActions,
  ListingWizardProgress,
} from '@/components/forms/ListingWizard';
import OwnerOtpGate from '@/components/forms/OwnerOtpGate';
import { markPageModified } from '@/hooks/useRefreshOnNavigation';
import useSubmissionFeedback from '@/hooks/useSubmissionFeedback';
import {
  buildListingPayloadBase,
  type FacilityOption,
  type ListingFormFields,
  type LocationData,
} from '@/lib/listings/listingForm';
import { LISTING_SUBMISSION_LIMITS } from '@/lib/listings/listingSubmissionRules';
import { slugify } from '@/lib/utils';
import {
  createInitialAddPropertyForm,
  type AddPropertyForm,
  WIZARD_STEPS,
} from './add-property-model';
import persistAddProperty from './persist-add-property';
import PropertySubmissionReview from './PropertySubmissionReview';
import useAddPropertyGallery from './use-add-property-gallery';
import useAddPropertyOwnerAuth, {
  type OwnerSubmissionCheck,
} from './use-add-property-owner-auth';
import useAddPropertyWizard from './use-add-property-wizard';

const MAX_LISTING_IMAGES = LISTING_SUBMISSION_LIMITS.maxImages;

export default function AddPropertyPage({ initialFacilities }: { initialFacilities: FacilityOption[] }) {
  return (
    <OwnerOtpGate purpose="listing-create">
      {({ session }) => (
        <AddPropertyForm key={session.user.id} initialFacilities={initialFacilities} session={session} />
      )}
    </OwnerOtpGate>
  );
}

function AddPropertyForm({ initialFacilities, session }: {
  initialFacilities: FacilityOption[];
  session: Session;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState<AddPropertyForm>(createInitialAddPropertyForm);
  const facilitiesList = initialFacilities;
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [administrativeLocationValid, setAdministrativeLocationValid] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [listingOwnerId, setListingOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ownerConfirmationRequired, setOwnerConfirmationRequired] = useState(false);

  const wizardContentRef = useRef<HTMLDivElement | null>(null);
  const submissionInProgressRef = useRef(false);

  const {
    message,
    tone,
    failedUploads,
    failedUploadNames,
    clearFeedback,
    setError,
    setErrorFromUnknown,
    setUploadError,
  } = useSubmissionFeedback('error');

  const gallery = useAddPropertyGallery({
    clearFeedback,
    setError,
    setUploadError,
  });

  const ownerAuth = useAddPropertyOwnerAuth(session);

  const validationInput = useMemo(() => ({
    formData,
    administrativeLocationValid,
    locationData,
    locationConfirmed: isLocationConfirmed,
    imagesCount: gallery.totalImages,
    acceptedTerms,
    requireTerms: true,
    requireCompleteProfile: true,
  }), [
    acceptedTerms,
    administrativeLocationValid,
    formData,
    gallery.totalImages,
    isLocationConfirmed,
    locationData,
  ]);

  const scrollToStepStart = useCallback(() => {
    window.requestAnimationFrame(() => {
      wizardContentRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      wizardContentRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const wizard = useAddPropertyWizard({
    validationInput,
    clearFeedback,
    setError,
    onStepChanged: scrollToStepStart,
  });

  const selectedFacilityNames = useMemo(
    () => facilitiesList
      .filter((facility) => selectedFacilities.includes(facility.id))
      .map((facility) => facility.name),
    [facilitiesList, selectedFacilities],
  );

  const handleChange = useCallback((key: keyof ListingFormFields, value: string) => {
    clearFeedback();
    if (
      (key === 'judet' || key === 'localitate') &&
      formData[key] !== value
    ) {
      setIsLocationConfirmed(false);
      setLocationData(null);
    }
    setFormData((current) => ({ ...current, [key]: value }));
  }, [clearFeedback, formData]);

  const handleLocationSelect = useCallback((location: LocationData) => {
    setLocationData(location);
    setFormData((current) => ({
      ...current,
      judet: location.county || current.judet,
      localitate: location.city || current.localitate,
      sat: location.village ?? current.sat,
    }));
  }, []);

  const handleLocationConfirmChange = useCallback((confirmed: boolean) => {
    setIsLocationConfirmed(confirmed);
    if (confirmed) clearFeedback();
  }, [clearFeedback]);

  const toggleFacility = useCallback((facilityId: string) => {
    clearFeedback();
    setSelectedFacilities((current) =>
      current.includes(facilityId)
        ? current.filter((item) => item !== facilityId)
        : [...current, facilityId],
    );
  }, [clearFeedback]);

  const handleSwitchOwnerAccount = useCallback(async () => {
    if (listingId) {
      setError('Draftul a fost deja asociat contului confirmat. Reîncarcă pagina pentru a începe cu alt email.');
      return;
    }

    if (!window.confirm('Schimbarea contului reia formularul de la început. Datele și fotografiile nesalvate se vor pierde. Continui?')) return;

    clearFeedback();
    try {
      await ownerAuth.switchOwnerAccount(
        submissionInProgressRef.current ||
          loading ||
          gallery.uploading ||
          gallery.isUploadInProgress(),
      );
      setOwnerConfirmationRequired(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nu am putut schimba contul de proprietar.');
    }
  }, [clearFeedback, gallery, listingId, loading, ownerAuth, setError]);

  const resetForm = useCallback(() => {
    setFormData(createInitialAddPropertyForm());
    setSelectedFacilities([]);
    setAcceptedTerms(false);
    setNewsletterOptIn(false);
    setIsLocationConfirmed(false);
    setLocationData(null);
    setListingId(null);
    setListingOwnerId(null);
    gallery.resetGallery();
  }, [gallery]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInProgressRef.current) return;

    if (wizard.activeStepIndex < WIZARD_STEPS.length - 1) {
      wizard.continueToNextStep();
      return;
    }

    clearFeedback();
    if (formData.honeypot) return;
    if (wizard.findFirstInvalidStep()) return;

    submissionInProgressRef.current = true;

    let ownerCheck: OwnerSubmissionCheck;
    try {
      ownerCheck = await ownerAuth.checkOwnerForSubmission();
    } catch (error) {
      submissionInProgressRef.current = false;
      setErrorFromUnknown(error);
      return;
    }

    if (ownerCheck.status === 'needs-confirmation') {
      submissionInProgressRef.current = false;
      setOwnerConfirmationRequired(true);
      setError('Confirmă contul de proprietar afișat înainte de trimitere.');
      return;
    }

    if (listingOwnerId && listingOwnerId !== ownerCheck.ownerId) {
      submissionInProgressRef.current = false;
      setError('Draftul aparține altui cont. Reia formularul cu emailul folosit la prima trimitere.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.titlu,
        slug: slugify(formData.titlu) || 'cazare',
        ...buildListingPayloadBase(formData, locationData),
        is_published: false,
        newsletter_opt_in: newsletterOptIn,
        terms_accepted: acceptedTerms,
      };

      await persistAddProperty({
        listingId,
        expectedOwnerId: ownerCheck.ownerId,
        payload,
        facilities: selectedFacilities,
        honeypot: formData.honeypot,
        uploadPendingFiles: gallery.uploadPendingFiles,
        getOrderedImageIds: gallery.getOrderedImageIds,
        onListingReady: (createdListingId) => {
          setListingId(createdListingId);
          setListingOwnerId(ownerCheck.ownerId);
        },
      });

      markPageModified();
      resetForm();
      router.push('/proprietari?trimis=1');
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        Array.isArray((error as { failed?: unknown[] }).failed)
      ) {
        setUploadError(error);
      } else {
        setErrorFromUnknown(error);
      }
    } finally {
      submissionInProgressRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <h1 className="sr-only">Adaugă o proprietate</h1>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 py-4 text-sm dark:border-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-300">
            Adaugi proprietatea în contul <span className="font-semibold text-zinc-950 dark:text-white">{ownerAuth.activeOwnerEmail}</span>
          </p>
          <button
            type="button"
            onClick={() => void handleSwitchOwnerAccount()}
            disabled={Boolean(listingId) || loading || gallery.uploading || ownerAuth.switchingOwnerAccount}
            className="font-semibold text-emerald-700 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300"
          >
            Folosește alt email
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div
            ref={wizardContentRef}
            tabIndex={-1}
            role="region"
            aria-labelledby={`wizard-step-${wizard.activeStep.id}`}
            className="scroll-mt-24 outline-none"
          >
            <div className="mb-2">
              <ListingWizardProgress
                steps={WIZARD_STEPS}
                activeIndex={wizard.activeStepIndex}
                furthestIndex={wizard.furthestStepIndex}
                onStepSelect={wizard.selectStep}
              />
            </div>

            <h2 id={`wizard-step-${wizard.activeStep.id}`} className="sr-only">
              {wizard.activeStep.label}: {wizard.activeStep.description}
            </h2>

            <div className="py-4">
              <div className="space-y-4">
                <ListingForm
                  activeSection={wizard.activeStep.formSection}
                  formData={formData}
                  onChange={handleChange}
                  facilities={facilitiesList}
                  selectedFacilities={selectedFacilities}
                  onToggleFacility={toggleFacility}
                  onLocationSelect={handleLocationSelect}
                  onLocationConfirmChange={handleLocationConfirmChange}
                  onAdministrativeLocationValidityChange={setAdministrativeLocationValid}
                  autoLocate={false}
                  initialCounty={formData.judet}
                  initialCity={formData.localitate}
                  initialLat={locationData?.latitude ?? null}
                  initialLng={locationData?.longitude ?? null}
                  initialLocationConfirmed={isLocationConfirmed}
                  dropzoneTitle={`Încarcă imagini (minimum ${LISTING_SUBMISSION_LIMITS.minImages}, maximum ${MAX_LISTING_IMAGES})`}
                  dropzoneSubtitle="Acceptă .jpg, .png, .webp sau .avif, maximum 15 MB"
                  dropzoneHelper="Click sau trage imaginile aici"
                  showValidation={wizard.showValidation}
                  invalidFields={wizard.currentStepValidation.invalidFields}
                  imagesInvalid={wizard.currentStepValidation.imagesInvalid}
                  imagesError={
                    wizard.currentStepValidation.imagesInvalid
                      ? wizard.currentStepValidation.error
                      : null
                  }
                  locationInvalid={wizard.currentStepValidation.locationInvalid}
                  minimumImagesRequired={LISTING_SUBMISSION_LIMITS.minImages}
                  validationAttempt={wizard.validationAttempt}
                  isDropActive={gallery.isDropActive}
                  onDropActiveChange={gallery.setIsDropActive}
                  onFilesSelected={gallery.handleFilesSelected}
                  files={gallery.files}
                  previews={gallery.filePreviews}
                  draggingIdx={gallery.draggingIdx}
                  onDragStart={gallery.handleDragStart}
                  onDragOver={gallery.handleDragOver}
                  onDragEnd={gallery.handleDragEnd}
                  onMove={gallery.moveFile}
                  onRemove={gallery.removeFile}
                  selectedImagesLocked={gallery.uploading}
                  galleryOrder={gallery.galleryOrder}
                  pendingImageIds={gallery.pendingIds}
                  onMoveGalleryToken={gallery.moveGalleryToken}
                  onReorderGalleryToken={gallery.reorderGalleryToken}
                  onDeleteGalleryToken={(token) => {
                    void gallery.deleteGalleryToken(token, listingOwnerId);
                  }}
                  selectedImagesTitle="Fotografii selectate"
                  selectedImagesSubtitle="Trage imaginile pentru a stabili ordinea galeriei"
                  selectedFailedNames={failedUploadNames}
                  existingImages={gallery.images}
                  existingTitle="Galeria încărcată pe draft"
                  existingSubtitle="Reordonează sau șterge imaginile înainte de trimiterea finală"
                  maxImagesWarning={MAX_LISTING_IMAGES}
                  descriptionMin={LISTING_SUBMISSION_LIMITS.descriptionMinLength}
                  descriptionMax={LISTING_SUBMISSION_LIMITS.descriptionMaxLength}
                  descriptionRequired
                />

                {wizard.activeStep.id === 'review' && (
                  <PropertySubmissionReview
                    formData={formData}
                    selectedFacilityNames={selectedFacilityNames}
                    imagesCount={gallery.totalImages}
                    locationConfirmed={isLocationConfirmed}
                    activeOwnerEmail={ownerAuth.activeOwnerEmail}
                    activeOwnerConfirmed={ownerAuth.activeOwnerConfirmed}
                    showActiveOwnerError={
                      ownerConfirmationRequired && Boolean(ownerAuth.activeOwnerEmail)
                    }
                    switchingOwnerAccount={ownerAuth.switchingOwnerAccount}
                    ownerAccountActionsDisabled={
                      Boolean(listingId) ||
                      ownerAuth.switchingOwnerAccount ||
                      loading ||
                      gallery.uploading
                    }
                    onEditStep={wizard.moveToStep}
                    onActiveOwnerConfirmedChange={(checked) => {
                      ownerAuth.setActiveOwnerConfirmed(checked);
                      setOwnerConfirmationRequired(false);
                      if (checked) clearFeedback();
                    }}
                    onSwitchOwnerAccount={() => void handleSwitchOwnerAccount()}
                  />
                )}

                {wizard.activeStep.id === 'review' && (
                  <ClientListingConsentPanel
                    acceptedTerms={acceptedTerms}
                    newsletterOptIn={newsletterOptIn}
                    showTermsError={
                      wizard.showValidation && wizard.currentStepValidation.termsInvalid
                    }
                    onAcceptedTermsChange={(checked) => {
                      setAcceptedTerms(checked);
                      if (checked) clearFeedback();
                    }}
                    onNewsletterOptInChange={setNewsletterOptIn}
                  />
                )}

                <ListingSubmitFeedback
                  message={message}
                  tone={tone}
                  failedUploads={failedUploads}
                />
              </div>
            </div>
          </div>

          <input
            type="text"
            name="website"
            value={formData.honeypot}
            onChange={(event) =>
              setFormData((current) => ({ ...current, honeypot: event.target.value }))
            }
            className="hidden"
            aria-hidden
            tabIndex={-1}
            autoComplete="off"
          />

          <div className="sticky bottom-0 z-20">
            <ListingWizardActions
              activeIndex={wizard.activeStepIndex}
              totalSteps={WIZARD_STEPS.length}
              uploading={gallery.uploading}
              uploadedCount={gallery.uploadedCount}
              totalFiles={gallery.files.length}
              loading={loading || ownerAuth.switchingOwnerAccount}
              submitLabel="Trimite spre verificare"
              loadingLabel={
                ownerAuth.switchingOwnerAccount ? 'Se schimbă contul...' : 'Se trimite...'
              }
              helperText={wizard.activeStep.helperText}
              onBack={() => wizard.moveToStep(wizard.activeStepIndex - 1)}
              onContinue={wizard.continueToNextStep}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
