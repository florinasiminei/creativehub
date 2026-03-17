'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClientListingConsentPanel from '@/components/forms/ClientListingConsentPanel';
import ListingForm from '@/components/forms/ListingForm';
import FormPageShell, { FormPageState } from '@/components/forms/FormPageShell';
import FormSubmitBar from '@/components/forms/FormSubmitBar';
import ListingSubmitFeedback from '@/components/forms/ListingSubmitFeedback';
import { supabase } from '@/lib/supabaseClient';
import useImageSelection from '@/hooks/useImageSelection';
import useImageUploads from '@/hooks/useImageUploads';
import useListingForm from '@/hooks/useListingForm';
import useSubmissionFeedback from '@/hooks/useSubmissionFeedback';
import useStoredAccessToken from '@/hooks/useStoredAccessToken';
import { markPageModified } from '@/hooks/useRefreshOnNavigation';
import { createListing, deleteListing } from '@/lib/api/listings';
import { sortFacilitiesByPriority } from '@/lib/facilitiesCatalog';
import {
  buildListingPayloadBase,
  createEmptyListingFormFields,
  type FacilityOption,
  type ListingFormFields,
  type LocationData,
  withClientListingMeta,
} from '@/lib/listings/listingForm';
import { slugify } from '@/lib/utils';

type SimpleForm = ReturnType<typeof createInitialAddPropertyForm>;

function createInitialAddPropertyForm() {
  return {
    ...createEmptyListingFormFields(),
    honeypot: '',
  };
}

function AddPropertyPageContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const isClient = searchParams.get('client') === '1' || searchParams.get('role') === 'client';
  const router = useRouter();
  const { token: inviteToken, tokenReady } = useStoredAccessToken({
    queryToken: tokenParam,
    storageKey: 'invite_token',
    cleanupPath: '/add-property',
    stripQueryToken: true,
  });
  const [formData, setFormData] = useState<SimpleForm>(createInitialAddPropertyForm);
  const [facilitiesList, setFacilitiesList] = useState<FacilityOption[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(!isClient);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const { message, failedUploads, failedUploadNames, clearFeedback, setError, setErrorFromUnknown, setUploadError } =
    useSubmissionFeedback('error');

  const { uploading, uploadedCount, upload } = useImageUploads({
    onError: (nextMessage) => setError(nextMessage),
  });

  const {
    files,
    filePreviews,
    draggingIdx,
    isDropActive,
    setIsDropActive,
    appendFiles,
    moveFile,
    removeFile,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    resetFiles,
  } = useImageSelection({
    maxFiles: Number.POSITIVE_INFINITY,
    onLimit: (nextMessage) => setError(nextMessage),
  });

  useEffect(() => {
    let mounted = true;

    async function fetchFacilities() {
      try {
        const { data } = await supabase.from('facilities').select('id, name');
        if (mounted && data) {
          setFacilitiesList(sortFacilitiesByPriority(data as FacilityOption[]));
        }
      } catch {
        // Ignore facilities fetch errors here; validation and submit still work.
      }
    }

    fetchFacilities();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setAcceptedTerms(!isClient);
  }, [isClient]);

  const handleChange = (key: keyof ListingFormFields, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleLocationSelect = (location: LocationData) => {
    setLocationData(location);
  };

  const toggleFacility = (facilityId: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(facilityId) ? prev.filter((item) => item !== facilityId) : [...prev, facilityId]
    );
  };

  const { error: validationError, invalidFields, imagesInvalid } = useListingForm({
    requiredFields: [
      { key: 'titlu', value: formData.titlu, label: 'Titlu' },
      { key: 'judet', value: formData.judet, label: 'Judet' },
      { key: 'localitate', value: formData.localitate, label: 'Localitate' },
      { key: 'pret', value: formData.pret, label: 'Pret' },
      { key: 'capacitate', value: formData.capacitate, label: 'Capacitate' },
      { key: 'telefon', value: formData.telefon, label: 'Telefon' },
    ],
    capacity: formData.capacitate,
    phone: formData.telefon,
    phoneKey: 'telefon',
    imagesCount: files.length,
    minImages: isClient ? 5 : 0,
    maxImages: 20,
    description: formData.descriere,
    descriptionKey: 'descriere',
    descriptionMin: 200,
    descriptionMax: 1000,
    enforceDescription: isClient,
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setShowValidation(true);

    if (formData.honeypot) return;

    if (validationError) {
      setError(invalidFields.length === 0 ? validationError : null);
      setValidationAttempt((prev) => prev + 1);
      return;
    }

    if (isClient && !acceptedTerms) {
      setError('Te rugam sa accepti termenii si conditiile.');
      return;
    }

    if (!isLocationConfirmed || !locationData) {
      setError('Te rugam sa confirmi locatia.');
      return;
    }

    setLoading(true);

    try {
      const payload = withClientListingMeta(
        {
          title: formData.titlu,
          slug: slugify(formData.titlu || '') || 'cazare',
          ...buildListingPayloadBase(formData, locationData),
          is_published: false,
        },
        { isClient, newsletterOptIn, acceptedTerms }
      );

      const created = await createListing(payload, selectedFacilities, inviteToken);
      const listingId = created.id;
      const listingToken = created.editToken || null;

      if (files.length > 0) {
        try {
          await upload(listingId, files, 0, listingToken);
        } catch (error: any) {
          try {
            await deleteListing(listingId, inviteToken);
          } catch {
            // Ignore rollback errors.
          }
          setUploadError(error);
          return;
        }
      }

      markPageModified();
      if (isClient) router.push('/?submitted=1');
      else router.push(`/drafts?created=1&id=${listingId}`);

      setFormData(createInitialAddPropertyForm());
      setSelectedFacilities([]);
      resetFiles();
    } catch (error: any) {
      setErrorFromUnknown(error);
    } finally {
      setLoading(false);
    }
  };

  if (!inviteToken) {
    if (!tokenReady) {
      return (
        <FormPageShell
          eyebrow="Formular de publicare pe cabn.ro"
          title="Adauga o proprietate"
          description="Pregatim formularul si validam linkul de acces inainte sa poti trimite proprietatea."
        >
          <FormPageState title="Se incarca..." description="Verificam accesul." />
        </FormPageShell>
      );
    }

    return (
      <FormPageShell
        eyebrow="Formular de publicare pe cabn.ro"
        title="Adauga o proprietate"
        description="Acest flux este rezervat proprietarilor care au primit un link de acces de la echipa cabn."
      >
        <FormPageState
          title="Acces restrictionat"
          description="Ai nevoie de un link valid pentru a adauga o proprietate."
        />
      </FormPageShell>
    );
  }

  return (
    <FormPageShell
      eyebrow="Formular de publicare pe cabn.ro"
      title="Adauga o proprietate"
      description="Completeaza profilul cabanei, confirma pozitia pe harta si incarca galeria in ordinea in care vrei sa fie vazuta."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
          Toate campurile sunt obligatorii, cu exceptia celor marcate ca optionale. Proprietatile trimise de clienti intra in revizie inainte de publicare.
        </div>

        <ListingForm
          formData={formData}
          onChange={handleChange}
          facilities={facilitiesList}
          selectedFacilities={selectedFacilities}
          onToggleFacility={toggleFacility}
          onLocationSelect={handleLocationSelect}
          onLocationConfirmChange={(confirmed) => {
            setIsLocationConfirmed(confirmed);
            if (!confirmed) setLocationData(null);
          }}
          initialCounty={formData.judet}
          initialCity={formData.localitate}
          dropzoneTitle="Incarca imagini (minim 5, maxim 20)"
          dropzoneSubtitle="Accepta .jpg, .png, .webp, .avif, .heic"
          dropzoneHelper="Click sau trage imaginile aici"
          showValidation={showValidation}
          invalidFields={invalidFields}
          imagesInvalid={imagesInvalid}
          validationAttempt={validationAttempt}
          isDropActive={isDropActive}
          onDropActiveChange={setIsDropActive}
          onFilesSelected={appendFiles}
          files={files}
          previews={filePreviews}
          draggingIdx={draggingIdx}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onMove={moveFile}
          onRemove={removeFile}
          selectedImagesTitle="Ordinea galeriei foto"
          selectedImagesSubtitle="Trage sau foloseste sagetile pentru ordinea de afisare (5-20 imagini)"
          selectedFailedNames={failedUploadNames}
          maxImagesWarning={20}
          descriptionMin={200}
          descriptionMax={1000}
          descriptionRequired={isClient}
        />

        <input
          type="text"
          value={formData.honeypot}
          onChange={(event) => setFormData((prev) => ({ ...prev, honeypot: event.target.value }))}
          className="hidden"
          aria-hidden
        />

        {isClient && (
          <ClientListingConsentPanel
            acceptedTerms={acceptedTerms}
            newsletterOptIn={newsletterOptIn}
            showTermsError={showValidation && !acceptedTerms}
            onAcceptedTermsChange={setAcceptedTerms}
            onNewsletterOptInChange={setNewsletterOptIn}
          />
        )}

        <FormSubmitBar
          uploading={uploading}
          uploadedCount={uploadedCount}
          totalFiles={files.length}
          loading={loading}
          submitLabel="Adauga proprietate"
          loadingLabel="Se salveaza..."
          idleLabel="Verifica datele, ordinea imaginilor si apoi trimite proprietatea."
        />

        <ListingSubmitFeedback message={message} tone="error" failedUploads={failedUploads} />
      </form>
    </FormPageShell>
  );
}

export default function AddPropertyPage() {
  return (
    <Suspense
      fallback={
        <FormPageShell
          eyebrow="Formular de publicare pe cabn.ro"
          title="Adauga o proprietate"
          description="Pregatim formularul de publicare si incarcam toate sectiunile necesare."
        >
          <FormPageState title="Se incarca..." description="Pregatim formularul de publicare." />
        </FormPageShell>
      }
    >
      <AddPropertyPageContent />
    </Suspense>
  );
}
