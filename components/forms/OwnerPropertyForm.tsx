'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import ClientListingConsentPanel from '@/components/forms/ClientListingConsentPanel';
import ListingForm from '@/components/forms/ListingForm';
import ListingSubmitFeedback from '@/components/forms/ListingSubmitFeedback';
import { ListingWizardActions, ListingWizardProgress } from '@/components/forms/ListingWizard';
import PropertySubmissionReview from '@/components/forms/PropertySubmissionReview';
import { markPageModified } from '@/hooks/useRefreshOnNavigation';
import useSubmissionFeedback from '@/hooks/useSubmissionFeedback';
import useOwnerPropertyGallery from '@/hooks/useOwnerPropertyGallery';
import useOwnerPropertyAccount, { type OwnerSubmissionCheck } from '@/hooks/useOwnerPropertyAccount';
import useOwnerPropertyWizard from '@/hooks/useOwnerPropertyWizard';
import {
  buildListingPayloadBase,
  type FacilityOption,
  type ListingFormFields,
  type LocationData,
} from '@/lib/listings/listingForm';
import { LISTING_SUBMISSION_LIMITS } from '@/lib/listings/listingSubmissionRules';
import {
  createInitialOwnerPropertyFields,
  hasValidPropertyCoordinates,
  type OwnerPropertyFields,
  type OwnerPropertyInitialListing,
  WIZARD_STEPS,
} from '@/lib/listings/ownerPropertyForm';
import persistOwnerPropertyCreate from '@/lib/listings/persistOwnerPropertyCreate';
import persistOwnerPropertyEdit from '@/lib/listings/persistOwnerPropertyEdit';
import { slugify } from '@/lib/utils';

const MAX_LISTING_IMAGES = LISTING_SUBMISSION_LIMITS.maxImages;

export type OwnerPropertyFormProps = {
  session: Session;
  initialFacilities: FacilityOption[];
  promotionEnabled?: boolean;
} & (
  | { mode: 'create'; initialListing?: never }
  | { mode: 'edit'; initialListing: OwnerPropertyInitialListing }
);

export default function OwnerPropertyForm({ session, initialFacilities, promotionEnabled = false, mode, initialListing }: OwnerPropertyFormProps) {
  const router = useRouter();
  const editing = mode === 'edit';
  const needsSubmission = !editing || initialListing?.isPublished !== true;
  const [formData, setFormData] = useState<OwnerPropertyFields>(() => initialListing
    ? { ...initialListing.formData, honeypot: '' }
    : createInitialOwnerPropertyFields());
  const facilitiesList = useMemo(() => initialFacilities.map((facility) => ({ id: String(facility.id), name: facility.name })), [initialFacilities]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(() => initialListing?.facilities.map(String) || []);
  const [administrativeLocationValid, setAdministrativeLocationValid] = useState<boolean | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(initialListing?.termsAccepted ?? false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(initialListing?.newsletterOptIn ?? false);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(() => hasValidPropertyCoordinates(initialListing?.locationData ?? null));
  const [locationData, setLocationData] = useState<LocationData | null>(() => hasValidPropertyCoordinates(initialListing?.locationData ?? null) ? initialListing?.locationData ?? null : null);
  const [listingId, setListingId] = useState<string | null>(initialListing?.id ?? null);
  const [listingOwnerId, setListingOwnerId] = useState<string | null>(initialListing ? session.user.id : null);
  const [loading, setLoading] = useState(false);
  const [navigationPending, setNavigationPending] = useState(false);
  const [ownerConfirmationRequired, setOwnerConfirmationRequired] = useState(false);
  const [requiresResubmission, setRequiresResubmission] = useState(false);
  const wizardContentRef = useRef<HTMLDivElement | null>(null);
  const submissionInProgressRef = useRef(false);
  const creationIdRef = useRef<string | null>(null);
  const activeRef = useRef(true);
  const allowExitRef = useRef(false);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  const {
    message, tone, failedUploads, failedUploadNames, clearFeedback,
    setError, setErrorFromUnknown, setUploadError,
  } = useSubmissionFeedback('error');

  const ownerAuth = useOwnerPropertyAccount(session);
  const isInteractionLocked = useCallback(() => submissionInProgressRef.current || allowExitRef.current || ownerAuth.switchingOwnerAccount, [ownerAuth.switchingOwnerAccount]);
  const gallery = useOwnerPropertyGallery({
    clearFeedback,
    setError,
    setUploadError,
    initialImages: initialListing?.images,
    isInteractionLocked,
  });
  const busy = loading || navigationPending || gallery.uploading || gallery.deleting || ownerAuth.switchingOwnerAccount;
  const { isMutationInProgress, deleteGalleryToken } = gallery;
  const isEditingBlocked = useCallback(() => isInteractionLocked() || isMutationInProgress(), [isMutationInProgress, isInteractionLocked]);
  const [savedGalleryOrder, setSavedGalleryOrder] = useState(() => initialListing?.images.map((image) => `saved:${image.id}`) || []);
  const [savedValues] = useState(() => JSON.stringify({
    formData: { ...formData, honeypot: undefined },
    facilities: [...selectedFacilities].sort(),
    acceptedTerms,
    newsletterOptIn,
    latitude: locationData?.latitude ?? null,
    longitude: locationData?.longitude ?? null,
  }));
  const dirty = requiresResubmission || savedValues !== JSON.stringify({
    formData: { ...formData, honeypot: undefined },
    facilities: [...selectedFacilities].sort(),
    acceptedTerms,
    newsletterOptIn,
    latitude: locationData?.latitude ?? null,
    longitude: locationData?.longitude ?? null,
  }) || JSON.stringify(gallery.galleryOrder) !== JSON.stringify(savedGalleryOrder);

  useEffect(() => {
    if (!dirty && !busy) return;
    function preventLoss(event: BeforeUnloadEvent) {
      if (allowExitRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    function confirmNavigation(event: MouseEvent) {
      if (allowExitRef.current || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement) || target.hasAttribute('download') || (target.target && target.target !== '_self')) return;
      const nextUrl = new URL(target.href, window.location.href);
      if (!['http:', 'https:'].includes(nextUrl.protocol)) return;
      if (nextUrl.origin === window.location.origin && nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return;
      if (submissionInProgressRef.current || isMutationInProgress() || busy || !window.confirm('Ai modificări nesalvate. Vrei să pleci fără să le salvezi?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener('beforeunload', preventLoss);
    document.addEventListener('click', confirmNavigation, true);
    return () => {
      window.removeEventListener('beforeunload', preventLoss);
      document.removeEventListener('click', confirmNavigation, true);
    };
  }, [busy, dirty, isMutationInProgress]);

  const validationInput = useMemo(() => ({
    formData,
    administrativeLocationValid: administrativeLocationValid === true,
    locationData,
    locationConfirmed: isLocationConfirmed,
    imagesCount: gallery.totalImages,
    acceptedTerms,
    requireTerms: true,
    requireCompleteProfile: true,
  }), [acceptedTerms, administrativeLocationValid, formData, gallery.totalImages, isLocationConfirmed, locationData]);

  const scrollToStepStart = useCallback(() => {
    window.requestAnimationFrame(() => {
      wizardContentRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      wizardContentRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const wizard = useOwnerPropertyWizard({ validationInput, clearFeedback, setError, onStepChanged: scrollToStepStart });
  const stepCompletion = wizard.stepCompletion.map((completed, index) =>
    WIZARD_STEPS[index].id === 'review' ? completed && (editing || ownerAuth.activeOwnerConfirmed) : completed);
  const locationPending = administrativeLocationValid === null && Boolean(formData.judet && formData.localitate);
  const selectedFacilityNames = useMemo(() => facilitiesList
    .filter((facility) => selectedFacilities.includes(facility.id))
    .map((facility) => facility.name), [facilitiesList, selectedFacilities]);

  const handleChange = useCallback((key: keyof ListingFormFields, value: string) => {
    if (isEditingBlocked()) return;
    clearFeedback();
    if ((key === 'judet' || key === 'localitate') && formData[key] !== value) {
      setAdministrativeLocationValid(null);
      setIsLocationConfirmed(false);
      setLocationData(null);
    }
    setFormData((current) => ({ ...current, [key]: value }));
  }, [clearFeedback, formData, isEditingBlocked]);

  const handleLocationSelect = useCallback((location: LocationData) => {
    if (isEditingBlocked()) return;
    setLocationData(location);
    setFormData((current) => ({
      ...current,
      judet: location.county || current.judet,
      localitate: location.city || current.localitate,
      sat: location.village ?? current.sat,
    }));
  }, [isEditingBlocked]);

  const handleLocationConfirmChange = useCallback((confirmed: boolean) => {
    if (isEditingBlocked()) return;
    setIsLocationConfirmed(confirmed);
    if (confirmed) clearFeedback();
  }, [clearFeedback, isEditingBlocked]);

  const toggleFacility = useCallback((facilityId: string) => {
    if (isEditingBlocked()) return;
    clearFeedback();
    setSelectedFacilities((current) => current.includes(facilityId)
      ? current.filter((item) => item !== facilityId)
      : [...current, facilityId]);
  }, [clearFeedback, isEditingBlocked]);

  const handleDeletePhoto = useCallback(async (token: string) => {
    if (isEditingBlocked()) return;
    const saved = token.startsWith('saved:');
    if (saved && !window.confirm('Ștergi această fotografie din cazare? Ștergerea se aplică imediat și nu poate fi anulată.')) return;
    const deleted = await deleteGalleryToken(token, listingOwnerId);
    if (deleted && saved && activeRef.current) {
      setSavedGalleryOrder((current) => current.filter((item) => item !== token));
      if (needsSubmission) setRequiresResubmission(true);
    }
  }, [deleteGalleryToken, isEditingBlocked, listingOwnerId, needsSubmission]);

  const handleSwitchOwnerAccount = useCallback(async () => {
    if (editing || isEditingBlocked()) return;
    if (listingId) {
      setError('Draftul a fost deja asociat contului confirmat. Reîncarcă pagina pentru a începe cu alt email.');
      return;
    }
    if (!window.confirm('Schimbarea contului reia formularul de la început. Datele și fotografiile nesalvate se vor pierde. Continui?')) return;
    clearFeedback();
    try {
      await ownerAuth.switchOwnerAccount(isEditingBlocked());
      if (activeRef.current) setOwnerConfirmationRequired(false);
    } catch (error) {
      if (activeRef.current) setError(error instanceof Error ? error.message : 'Nu am putut schimba contul de proprietar.');
    }
  }, [clearFeedback, editing, isEditingBlocked, listingId, ownerAuth, setError]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEditingBlocked()) return;
    if (wizard.activeStepIndex < WIZARD_STEPS.length - 1) {
      wizard.continueToNextStep();
      return;
    }
    clearFeedback();
    if (formData.honeypot || wizard.findFirstInvalidStep()) return;

    submissionInProgressRef.current = true;
    setLoading(true);
    try {
      const ownerCheck: OwnerSubmissionCheck = editing
        ? { status: 'ready', ownerId: session.user.id, email: ownerAuth.activeOwnerEmail }
        : await ownerAuth.checkOwnerForSubmission();
      if (!activeRef.current) return;
      if (ownerCheck.status === 'needs-confirmation') {
        setOwnerConfirmationRequired(true);
        setError('Confirmă contul de proprietar afișat înainte de trimitere.');
        return;
      }
      if (listingOwnerId && listingOwnerId !== ownerCheck.ownerId) {
        throw new Error('Cazarea aparține altui cont. Reia operația din contul proprietarului.');
      }

      const payload = {
        title: formData.titlu,
        ...buildListingPayloadBase(formData, locationData),
        newsletter_opt_in: newsletterOptIn,
        terms_accepted: acceptedTerms,
      };
      if (editing) {
        if (!listingId || !initialListing) throw new Error('Nu am putut identifica proprietatea. Reîncarcă pagina.');
        await persistOwnerPropertyEdit({
          listingId,
          expectedOwnerId: ownerCheck.ownerId,
          payload,
          facilities: selectedFacilities,
          isPublished: initialListing.isPublished,
          uploadPendingFiles: gallery.uploadPendingFiles,
          getOrderedImageIds: gallery.getOrderedImageIds,
        });
        if (!activeRef.current) return;
        markPageModified();
        allowExitRef.current = true;
        setNavigationPending(true);
        const result = needsSubmission ? 'trimis=1' : 'actualizat=1';
        router.push(`/proprietari?${result}&promovare=${listingId}`);
      } else {
        creationIdRef.current ??= crypto.randomUUID();
        const submittedListingId = await persistOwnerPropertyCreate({
          listingId,
          creationId: creationIdRef.current,
          expectedOwnerId: ownerCheck.ownerId,
          payload: { ...payload, slug: slugify(formData.titlu) || 'cazare', is_published: false },
          facilities: selectedFacilities,
          honeypot: formData.honeypot,
          uploadPendingFiles: gallery.uploadPendingFiles,
          getOrderedImageIds: gallery.getOrderedImageIds,
          onListingReady: (createdListingId) => {
            if (!activeRef.current) return;
            setListingId(createdListingId);
            setListingOwnerId(ownerCheck.ownerId);
          },
        });
        if (!activeRef.current) return;
        markPageModified();
        allowExitRef.current = true;
        setNavigationPending(true);
        router.push(promotionEnabled ? `/proprietari/promovare/${submittedListingId}?trimis=1` : '/proprietari?trimis=1');
      }
    } catch (error) {
      allowExitRef.current = false;
      setNavigationPending(false);
      if (!activeRef.current) return;
      if (error && typeof error === 'object' && Array.isArray((error as { failed?: unknown[] }).failed)) setUploadError(error);
      else setErrorFromUnknown(error);
    } finally {
      submissionInProgressRef.current = false;
      if (activeRef.current) setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <h1 className={editing ? "pt-4 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white" : "sr-only"}>{editing ? 'Editează cazarea' : 'Adaugă o proprietate'}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 py-4 text-sm dark:border-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-300">
            {editing ? 'Editezi cazarea din contul' : 'Adaugi proprietatea în contul'} <span className="font-semibold text-zinc-950 dark:text-white">{ownerAuth.activeOwnerEmail}</span>
          </p>
          {!editing && <button
            type="button"
            onClick={() => void handleSwitchOwnerAccount()}
            disabled={Boolean(listingId) || busy}
            className="inline-flex min-h-11 items-center rounded-lg px-2 font-semibold text-emerald-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300"
          >
            Folosește alt email
          </button>}
        </div>
        {editing && <p className="pt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{needsSubmission ? 'Actualizează informațiile și retrimite cazarea spre verificare.' : 'Actualizează informațiile cazării. Modificările se salvează pentru listarea existentă.'}</p>}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          <p>Poți naviga între secțiuni. Informațiile se salvează la final.</p>
          <p role="status" className={`inline-flex items-center gap-1.5 font-medium ${dirty ? 'text-amber-800 dark:text-amber-300' : ''}`}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : dirty ? <Circle className="h-2 w-2 fill-current" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
            {busy ? navigationPending ? 'Salvat. Deschidem confirmarea…' : loading ? 'Se salvează…' : gallery.deleting ? 'Se șterge fotografia…' : 'Operație în curs…' : requiresResubmission ? 'Retrimitere necesară' : dirty ? 'Modificări nesalvate' : editing ? 'Date salvate' : 'Formular nou'}
          </p>
        </div>
        {gallery.deleting && <p role="status" className="pt-3 text-sm text-zinc-600 dark:text-zinc-300">Se șterge fotografia...</p>}
        <form onSubmit={handleSubmit} noValidate aria-busy={busy}>
          <fieldset disabled={busy} className="min-w-0 space-y-6 border-0 p-0">
          <div
            ref={wizardContentRef}
            tabIndex={-1}
            role="region"
            aria-labelledby={`wizard-step-${wizard.activeStep.id}`}
            className={`scroll-mt-24 outline-none ${busy ? 'pointer-events-none opacity-70' : ''}`}
          >
            <div className="mb-2">
              <ListingWizardProgress
                steps={WIZARD_STEPS}
                activeIndex={wizard.activeStepIndex}
                completedSteps={stepCompletion}
                pendingSteps={WIZARD_STEPS.map((step) => step.id === 'location' && locationPending)}
                disabled={busy}
                onStepSelect={(index) => { if (!isEditingBlocked()) wizard.selectStep(index); }}
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
                  selectedImagesLocked={busy}
                  galleryOrder={gallery.galleryOrder}
                  pendingImageIds={gallery.pendingIds}
                  onMoveGalleryToken={gallery.moveGalleryToken}
                  onReorderGalleryToken={gallery.reorderGalleryToken}
                  onDeleteGalleryToken={(token) => { void handleDeletePhoto(token); }}
                  selectedImagesTitle="Fotografii selectate"
                  selectedImagesSubtitle="Trage imaginile pentru a stabili ordinea galeriei"
                  selectedFailedNames={failedUploadNames}
                  existingImages={gallery.images}
                  existingTitle={editing ? 'Fotografiile cazării' : 'Galeria încărcată pe draft'}
                  existingSubtitle="Reordonează sau șterge imaginile înainte de salvare"
                  maxImagesWarning={MAX_LISTING_IMAGES}
                  descriptionMin={LISTING_SUBMISSION_LIMITS.descriptionMinLength}
                  descriptionMax={LISTING_SUBMISSION_LIMITS.descriptionMaxLength}
                  descriptionRequired
                />

                {wizard.activeStep.id === 'gallery' && gallery.images.length > 0 && (
                  <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Fotografiile deja încărcate se șterg imediat. Ordinea galeriei se păstrează când salvezi formularul.{needsSubmission ? ' După modificarea galeriei, retrimite cazarea spre verificare la final.' : ''}</p>
                )}

                {wizard.activeStep.id === 'review' && (
                  <PropertySubmissionReview
                    mode={mode}
                    formData={formData}
                    selectedFacilityNames={selectedFacilityNames}
                    imagesCount={gallery.totalImages}
                    locationConfirmed={isLocationConfirmed}
                    stepCompletion={stepCompletion}
                    locationPending={locationPending}
                    activeOwnerEmail={ownerAuth.activeOwnerEmail}
                    activeOwnerConfirmed={ownerAuth.activeOwnerConfirmed}
                    showActiveOwnerError={
                      ownerConfirmationRequired && Boolean(ownerAuth.activeOwnerEmail)
                    }
                    switchingOwnerAccount={ownerAuth.switchingOwnerAccount}
                    ownerAccountActionsDisabled={
                      Boolean(listingId) ||
                      ownerAuth.switchingOwnerAccount ||
                      busy
                    }
                    onEditStep={(index) => { if (!busy && !submissionInProgressRef.current) wizard.moveToStep(index); }}
                    onActiveOwnerConfirmedChange={(checked) => {
                      ownerAuth.setActiveOwnerConfirmed(checked);
                      setOwnerConfirmationRequired(false);
                      if (checked) clearFeedback();
                    }}
                    onSwitchOwnerAccount={() => void handleSwitchOwnerAccount()}
                  />
                )}

                {wizard.activeStep.id === 'review' && promotionEnabled && (
                  <p className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
                    {editing ? 'După salvare poți deschide promovarea Instagram din confirmare sau din contul tău.' : 'După trimitere poți pregăti gratuit promovarea pe Instagram cabn.ro.'} Vei putea edita și aproba postarea separat. Promovarea este opțională.
                  </p>
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
              loading={loading || navigationPending || gallery.deleting || ownerAuth.switchingOwnerAccount}
              submitLabel={needsSubmission ? 'Trimite spre verificare' : 'Salvează modificările'}
              loadingLabel={
                navigationPending ? 'Salvat' : ownerAuth.switchingOwnerAccount ? 'Se schimbă contul...' : gallery.deleting ? 'Se șterge fotografia...' : needsSubmission ? 'Se trimite...' : 'Se salvează...'
              }
              helperText={editing && wizard.activeStep.id === 'review' ? 'Verifică rezumatul și salvează modificările cazării.' : wizard.activeStep.helperText}
              onBack={() => { if (!busy && !submissionInProgressRef.current) wizard.moveToStep(wizard.activeStepIndex - 1); }}
              onContinue={() => { if (!busy && !submissionInProgressRef.current) wizard.continueToNextStep(); }}
            />
          </div>
          </fieldset>
        </form>
        <Link href="/proprietari" aria-disabled={busy} tabIndex={busy ? -1 : undefined} onClick={(event) => { if (busy || submissionInProgressRef.current) event.preventDefault(); }} className="my-4 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-zinc-500 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-zinc-400">
          Înapoi la cazările tale
        </Link>
      </div>
    </div>
  );
}
