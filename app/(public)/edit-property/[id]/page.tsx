"use client";

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ClientListingConsentPanel from '@/components/forms/ClientListingConsentPanel';
import ListingForm from '@/components/forms/ListingForm';
import FormPageShell, { FormPageState } from '@/components/forms/FormPageShell';
import FormSubmitBar from '@/components/forms/FormSubmitBar';
import ListingSubmitFeedback from '@/components/forms/ListingSubmitFeedback';
import LoadingLogo from '@/components/LoadingLogo';
import { supabase } from '@/lib/supabaseClient';
import useImageSelection from '@/hooks/useImageSelection';
import useImageUploads from '@/hooks/useImageUploads';
import useListingForm from '@/hooks/useListingForm';
import useSubmissionFeedback from '@/hooks/useSubmissionFeedback';
import useStoredAccessToken from '@/hooks/useStoredAccessToken';
import { markPageModified } from '@/hooks/useRefreshOnNavigation';
import { deleteListingImage, reorderListingImages, updateListing } from '@/lib/api/listings';
import { sortFacilitiesByPriority } from '@/lib/facilitiesCatalog';
import {
  buildListingPayloadBase,
  createEmptyListingFormFields,
  mapListingToFormFields,
  mapListingToLocationData,
  type ExistingImage as ListingImage,
  type FacilityOption,
  type ListingFormFields,
  type LocationData,
  withClientListingMeta,
} from '@/lib/listings/listingForm';

export default function EditPropertyPage({ params }: any) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = searchParams.get('client') === '1' || searchParams.get('role') === 'client';
  const tokenParam = searchParams.get('token');
  const { token: listingToken, tokenReady } = useStoredAccessToken({
    queryToken: tokenParam,
    storageKey: 'listing_token',
    cleanupPath: `/edit-property/${id}`,
    stripQueryToken: !isClient,
  });
  const [initializing, setInitializing] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ListingFormFields>(createEmptyListingFormFields);
  const [facilitiesList, setFacilitiesList] = useState<FacilityOption[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [draggingExistingIdx, setDraggingExistingIdx] = useState<number | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(!isClient);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const { message, tone, clearFeedback, setError, setSuccess, setErrorFromUnknown } = useSubmissionFeedback();

  const { uploading, uploadedCount, upload } = useImageUploads({
    onError: (nextMessage) => {
      setError(nextMessage);
    },
    listingToken,
  });

  const {
    files,
    filePreviews,
    draggingIdx: draggingNewIdx,
    isDropActive,
    setIsDropActive,
    appendFiles,
    moveFile,
    removeFile,
    handleDragStart: handleNewDragStart,
    handleDragOver: handleNewDragOver,
    handleDragEnd: handleNewDragEnd,
    resetFiles,
  } = useImageSelection({
    maxFiles: Number.POSITIVE_INFINITY,
    onLimit: (nextMessage) => {
      setError(nextMessage);
    },
  });

  useEffect(() => {
    setAcceptedTerms(!isClient);
  }, [isClient]);

  useEffect(() => {
    let mounted = true;

    async function loadListing() {
      if (!tokenReady) return;

      if (isClient && !listingToken) {
        if (mounted) {
          setInitializing(false);
          setAccessDenied(true);
        }
        return;
      }

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (listingToken) headers['x-listing-token'] = listingToken;

        const [listingResponse, facilitiesResponse] = await Promise.all([
          fetch('/api/listing-get', {
            method: 'POST',
            headers,
            body: JSON.stringify({ id }),
          }),
          supabase.from('facilities').select('id, name'),
        ]);

        const listingBody = await listingResponse.json().catch(() => null);

        if (!listingResponse.ok) {
          if (!mounted) return;
          if (listingResponse.status === 401) {
            setAccessDenied(true);
            setError('Linkul de acces este invalid sau a expirat.');
            return;
          }
          throw new Error(listingBody?.error || 'Nu am putut incarca proprietatea.');
        }

        const { listing, images: fetchedImages, facilities: selected } = listingBody || {};
        if (!mounted) return;

        if (listing) {
          setFormData(mapListingToFormFields(listing));
          setLocationData(mapListingToLocationData(listing));
          setNewsletterOptIn(Boolean((listing as any).newsletter_opt_in));
          setAcceptedTerms(Boolean((listing as any).terms_accepted));
        }

        if (facilitiesResponse.data) {
          setFacilitiesList(sortFacilitiesByPriority(facilitiesResponse.data as FacilityOption[]));
        }

        setSelectedFacilities(Array.isArray(selected) ? selected : selected || []);
        setImages((fetchedImages || []) as ListingImage[]);
        clearFeedback();
        setAccessDenied(false);
      } catch (error) {
        if (!mounted) return;
        setError(error instanceof Error ? error.message : 'A aparut o eroare la incarcare.');
      } finally {
        if (mounted) setInitializing(false);
      }
    }

    loadListing();
    return () => {
      mounted = false;
    };
  }, [clearFeedback, id, isClient, listingToken, setError, tokenReady]);

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
    imagesCount: images.length + files.length,
    minImages: isClient ? 5 : 0,
    maxImages: 20,
    description: formData.descriere,
    descriptionKey: 'descriere',
    descriptionMin: 200,
    descriptionMax: 1000,
    enforceDescription: isClient,
  });

  const moveExistingImage = (from: number, to: number) => {
    setImages((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleExistingDragStart = (index: number) => setDraggingExistingIdx(index);
  const handleExistingDragOver = (index: number) => {
    if (draggingExistingIdx === null || draggingExistingIdx === index) return;
    moveExistingImage(draggingExistingIdx, index);
    setDraggingExistingIdx(index);
  };
  const handleExistingDragEnd = () => setDraggingExistingIdx(null);

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setShowValidation(true);

    if (validationError) {
      setError(invalidFields.length === 0 ? validationError : null);
      setValidationAttempt((prev) => prev + 1);
      return;
    }

    if (isClient && !acceptedTerms) {
      setError('Te rugam sa accepti termenii si conditiile.');
      return;
    }

    setLoading(true);

    try {
      let updatedImages = images;

      if (files.length > 0) {
        try {
          const { uploaded } = await upload(id, files, images.length, listingToken);
          if (uploaded.length > 0) {
            updatedImages = [...images, ...uploaded.map((item) => ({ id: item.id, image_url: item.url, alt: null }))];
            setImages(updatedImages);
          }
        } catch (error: any) {
          const partialUploaded = Array.isArray(error?.uploaded)
            ? error.uploaded.map((item: any) => ({ id: item.id, image_url: item.url, alt: null }))
            : [];
          if (partialUploaded.length > 0) {
            updatedImages = [...images, ...partialUploaded];
            setImages(updatedImages);
          }
          setError(error?.failed ? error.message : error instanceof Error ? error.message : 'Nu s-au incarcat toate imaginile.');
          throw error;
        }
        resetFiles();
      }

      const payload = withClientListingMeta(
        {
          id,
          title: formData.titlu,
          ...buildListingPayloadBase(formData, locationData),
          facilities: selectedFacilities,
        },
        { isClient, newsletterOptIn, acceptedTerms }
      );

      await updateListing(payload, listingToken);

      if (updatedImages.length > 0) {
        await reorderListingImages(
          id,
          updatedImages.map((image) => image.id),
          listingToken
        );
      }

      setSuccess('Modificarile au fost salvate.');
      markPageModified();

      if (isClient) router.push('/?updated=1');
      else router.push('/drafts?updated=1');
    } catch (error: any) {
      if (Array.isArray(error?.failed)) {
        setError(error?.message || 'Nu s-au incarcat toate imaginile.');
      } else {
        setErrorFromUnknown(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExistingImage = async (image: ListingImage) => {
    try {
      await deleteListingImage(image.id, listingToken);
      setImages((prev) => prev.filter((item) => item.id !== image.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nu am putut sterge imaginea.');
    }
  };

  if (initializing) {
    return (
      <FormPageShell
        eyebrow="Administrare listare"
        title="Editeaza proprietatea"
        description="Pregatim formularul, imaginile si datele de localizare pentru editare."
      >
        <FormPageState title="Se incarca..." description="Incarcam datele proprietatii." />
      </FormPageShell>
    );
  }

  if (accessDenied) {
    return (
      <FormPageShell
        eyebrow="Administrare listare"
        title="Editeaza proprietatea"
        description="Acest formular poate fi accesat doar dintr-un link valid de administrare sau editare."
      >
        <FormPageState
          title="Acces restrictionat"
          description="Linkul de acces este invalid, a expirat sau nu mai este disponibil."
        />
      </FormPageShell>
    );
  }

  return (
    <FormPageShell
      eyebrow="Administrare listare"
      title="Editeaza proprietatea"
      description="Actualizeaza profilul cabanei, ordinea imaginilor si datele de contact inainte de publicare."
      highlights={[
        { label: 'Imagini existente', value: `${images.length}` },
        { label: 'Imagini noi', value: `${files.length}` },
        { label: 'Mod', value: isClient ? 'Editare client' : 'Editare interna' },
      ]}
    >
      {(loading || uploading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-black/70">
          <LoadingLogo />
        </div>
      )}

      <form onSubmit={handleUpdate} noValidate className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
          <span>
            Toate campurile sunt obligatorii, cu exceptia celor marcate ca optionale. Poti schimba ordinea imaginilor direct din aceasta pagina.
          </span>
          {!isClient && (
            <Link
              href="/drafts"
              prefetch={false}
              className="text-sm font-medium text-emerald-700 transition hover:text-emerald-900"
            >
              Inapoi la drafturi
            </Link>
          )}
        </div>

        <ListingForm
          formData={formData}
          onChange={handleChange}
          facilities={facilitiesList}
          selectedFacilities={selectedFacilities}
          onToggleFacility={toggleFacility}
          onLocationSelect={handleLocationSelect}
          autoLocate={false}
          initialCounty={formData.judet}
          initialCity={formData.localitate}
          initialLat={locationData?.latitude ?? null}
          initialLng={locationData?.longitude ?? null}
          dropzoneTitle={isClient ? 'Incarca imagini noi (minim 5, maxim 20 total)' : 'Incarca imagini noi (maxim 20 total)'}
          dropzoneSubtitle={
            isClient
              ? 'Selecteaza fisierele si ordoneaza-le inainte de publicare'
              : 'Selecteaza fisierele si ordoneaza-le pentru galeria finala'
          }
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
          draggingIdx={draggingNewIdx}
          onDragStart={handleNewDragStart}
          onDragOver={handleNewDragOver}
          onDragEnd={handleNewDragEnd}
          onMove={moveFile}
          onRemove={removeFile}
          selectedImagesTitle="Ordinea imaginilor noi"
          selectedImagesSubtitle={
            isClient
              ? 'Stabileste ordinea pentru incarcare (5-20 imagini total)'
              : 'Stabileste ordinea pentru incarcare (maxim 20 imagini total)'
          }
          maxImagesWarning={20}
          existingImages={images}
          existingTitle="Galeria actuala"
          existingSubtitle="Reordoneaza sau sterge imaginile deja salvate"
          existingDraggingIdx={draggingExistingIdx}
          onExistingDragStart={handleExistingDragStart}
          onExistingDragOver={handleExistingDragOver}
          onExistingDragEnd={handleExistingDragEnd}
          onExistingMove={moveExistingImage}
          onExistingDelete={handleDeleteExistingImage}
          descriptionMin={200}
          descriptionMax={1000}
          descriptionRequired={isClient}
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

        <div className="flex justify-end">
          <Link
            href={isClient ? '/' : '/drafts'}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
          >
            Anuleaza
          </Link>
        </div>

        <FormSubmitBar
          uploading={uploading}
          uploadedCount={uploadedCount}
          totalFiles={files.length}
          loading={loading}
          submitLabel="Salveaza modificari"
          loadingLabel="Se salveaza..."
          idleLabel="Verifica datele, galeria si apoi salveaza modificarile."
        />

        <ListingSubmitFeedback
          message={message}
          tone={tone}
        />
      </form>
    </FormPageShell>
  );
}
