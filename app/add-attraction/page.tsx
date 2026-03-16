'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AttractionForm from '@/components/forms/AttractionForm';
import FormPageShell, { FormPageState } from '@/components/forms/FormPageShell';
import FormSubmitBar from '@/components/forms/FormSubmitBar';
import ListingSubmitFeedback from '@/components/forms/ListingSubmitFeedback';
import useImageSelection from '@/hooks/useImageSelection';
import useAttractionImageUploads from '@/hooks/useAttractionImageUploads';
import useCountyLocalityData from '@/hooks/useCountyLocalityData';
import useSubmissionFeedback from '@/hooks/useSubmissionFeedback';
import useStoredAccessToken from '@/hooks/useStoredAccessToken';
import {
  createAttraction,
  deleteAttraction,
  deleteAttractionImage,
  getAttraction,
  reorderAttractionImages,
  updateAttraction,
} from '@/lib/api/attractions';
import {
  buildAttractionPayload,
  createEmptyAttractionFormState,
  mapAttractionToFormFields,
  mapAttractionToLocationData,
  type AttractionFormFields,
  type AttractionFormState,
  type AttractionImage,
  type AttractionLocationData,
} from '@/lib/attractions/attractionForm';
import { markPageModified } from '@/hooks/useRefreshOnNavigation';
import { validateImagesCount, validateRequired } from '@/lib/validation/listing';

function AddAttractionPageContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const editIdParam = (searchParams.get('editId') || '').trim();
  const isEditMode = editIdParam.length > 0;
  const { token: inviteToken, tokenReady } = useStoredAccessToken({
    queryToken: tokenParam,
    storageKey: 'invite_token',
    cleanupPath: '/add-attraction',
    stripQueryToken: true,
  });
  const [formData, setFormData] = useState<AttractionFormState>(createEmptyAttractionFormState);
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [useGeolocation, setUseGeolocation] = useState(false);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
  const [locationData, setLocationData] = useState<AttractionLocationData | null>(null);
  const [existingImages, setExistingImages] = useState<AttractionImage[]>([]);
  const [draggingExistingIdx, setDraggingExistingIdx] = useState<number | null>(null);
  const [loadingInitialData, setLoadingInitialData] = useState(false);
  const { message, failedUploads, failedUploadNames, clearFeedback, setError, setErrorFromUnknown, setUploadError } =
    useSubmissionFeedback('error');

  const router = useRouter();

  const { uploading, uploadedCount, upload } = useAttractionImageUploads({
    onError: (nextMessage) => setError(nextMessage),
    inviteToken,
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
    maxFiles: 12,
    onLimit: (nextMessage) => setError(nextMessage),
  });

  const handleChange = (key: keyof AttractionFormState | keyof AttractionFormFields, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFieldChange = (key: keyof AttractionFormFields, value: string) => {
    handleChange(key, value);
  };

  useEffect(() => {
    if (!isEditMode || !tokenReady) return;

    let mounted = true;
    setLoadingInitialData(true);

    async function loadAttractionForEdit() {
      try {
        const data = await getAttraction(editIdParam, inviteToken);
        if (!mounted) return;

        const attraction = data?.attraction || {};
        const nextLocationData = mapAttractionToLocationData(attraction);

        setFormData({ ...createEmptyAttractionFormState(), ...mapAttractionToFormFields(attraction) });
        setUseGeolocation(Boolean(nextLocationData));
        setIsLocationConfirmed(Boolean(nextLocationData));
        setLocationData(nextLocationData);
        setExistingImages(Array.isArray(data?.images) ? data.images : []);
      } catch (error: any) {
        if (!mounted) return;
        setError(error?.message || 'Nu am putut incarca atractia pentru editare.');
      } finally {
        if (mounted) setLoadingInitialData(false);
      }
    }

    loadAttractionForEdit();

    return () => {
      mounted = false;
    };
  }, [editIdParam, inviteToken, isEditMode, tokenReady]);

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

  const requiredError = validateRequired([{ value: formData.title, label: 'Nume atractie' }]);
  const imagesError = validateImagesCount(files.length + existingImages.length, 1, 12);
  const locationSelectionError = !countyHasMatch
    ? 'Selecteaza un judet din lista.'
    : resolvedCounty && !localityHasMatch
      ? 'Selecteaza o localitate din lista.'
      : null;
  const validationError = requiredError || locationSelectionError || imagesError;
  const hasInlineError = Boolean(requiredError || locationSelectionError);

  const moveExistingImage = (from: number, to: number) => {
    setExistingImages((prev) => {
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

  const handleDeleteExistingImage = async (image: AttractionImage) => {
    try {
      await deleteAttractionImage(image.id, inviteToken);
      setExistingImages((prev) => prev.filter((item) => item.id !== image.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nu am putut sterge imaginea.');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setShowValidation(true);

    if (formData.honeypot) return;

    if (validationError) {
      setError(hasInlineError ? null : validationError);
      setValidationAttempt((prev) => prev + 1);
      return;
    }

    if (useGeolocation && (!isLocationConfirmed || !locationData)) {
      setError('Te rugam sa confirmi locatia pe harta sau debifeaza geolocatia optionala.');
      return;
    }

    setLoading(true);

    try {
      const payload = buildAttractionPayload(formData, locationData);

      if (isEditMode) {
        await updateAttraction({ id: editIdParam, ...payload }, inviteToken);

        let updatedImages = existingImages;
        if (files.length > 0) {
          try {
            const { uploaded } = await upload(editIdParam, files, existingImages.length, inviteToken);
            if (uploaded.length > 0) {
              updatedImages = [
                ...existingImages,
                ...uploaded.map((item) => ({
                  id: item.id,
                  image_url: item.url,
                  display_order: item.display_order,
                  alt: null,
                })),
              ];
              setExistingImages(updatedImages);
            }
          } catch (error: any) {
            setUploadError(error);
            return;
          }
        }

        if (updatedImages.length > 0) {
          await reorderAttractionImages(
            editIdParam,
            updatedImages.map((image) => image.id),
            inviteToken
          );
        }

        markPageModified();
        router.push('/drafts?updated=1');
        resetFiles();
      } else {
        const created = await createAttraction(payload, inviteToken);
        const attractionId = created.id;

        try {
          await upload(attractionId, files, 0, inviteToken);
        } catch (error: any) {
          try {
            await deleteAttraction(attractionId, inviteToken);
          } catch {
            // ignore rollback errors
          }
          setUploadError(error);
          return;
        }

        markPageModified();
        router.push('/drafts');

        setFormData(createEmptyAttractionFormState());
        setUseGeolocation(false);
        setIsLocationConfirmed(false);
        setLocationData(null);
        setExistingImages([]);
        resetFiles();
      }
    } catch (error: any) {
      const raw = String(error?.message || '');
      if (/unauthorized/i.test(raw)) {
        setError(
          isEditMode
            ? 'Nu ai acces pentru a edita atractii. Intra din pagina Drafts cu cont de staff/admin.'
            : 'Nu ai acces pentru a adauga atractii. Intra din pagina Drafts cu cont de staff/admin.'
        );
      } else {
        setErrorFromUnknown(raw ? new Error(raw) : error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!tokenReady || loadingInitialData) {
    return (
      <FormPageShell
        eyebrow="Formular de publicare pe cabn.ro"
        title={isEditMode ? 'Editeaza atractia' : 'Adauga o atractie'}
        description="Pregatim formularul si datele necesare pentru a salva atractia in catalogul intern."
      >
        <FormPageState
          title="Se incarca..."
          description={isEditMode ? 'Pregatim datele atractiei.' : 'Verificam accesul.'}
        />
      </FormPageShell>
    );
  }

  return (
    <FormPageShell
      eyebrow="Formular de publicare pe cabn.ro"
      title={isEditMode ? 'Editeaza atractia' : 'Adauga o atractie'}
      description={
        isEditMode
          ? 'Actualizeaza datele, geolocatia si imaginile fara sa iesi din fluxul de administrare.'
          : 'Adauga rapid puncte de interes locale care pot fi asociate ulterior cu proprietatile.'
      }
      highlights={[
        { label: 'Tip', value: 'Atractie locala' },
        { label: 'Galerie', value: 'Intre 1 si 12 imagini' },
        { label: 'Status', value: isEditMode ? 'Editare draft' : 'Creare noua' },
      ]}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
          Campurile marcate cu * sunt obligatorii. Pentru atractii, geolocatia este optionala, dar utila daca
          vrei sa le conectezi ulterior cu cazari din apropiere.
        </div>

        <AttractionForm
          formData={formData}
          onChange={handleFieldChange}
          useGeolocation={useGeolocation}
          onUseGeolocationChange={(enabled) => {
            setUseGeolocation(enabled);
            if (!enabled) {
              setIsLocationConfirmed(false);
              setLocationData(null);
            }
          }}
          locationData={locationData}
          onLocationSelect={setLocationData}
          onLocationConfirmChange={(confirmed) => {
            setIsLocationConfirmed(confirmed);
            if (!confirmed) setLocationData(null);
          }}
          locationsError={locationsError}
          filteredCounties={filteredCounties}
          filteredLocalities={filteredLocalities}
          resolvedCounty={resolvedCounty}
          resolvedLocality={resolvedLocality}
          countyHasMatch={countyHasMatch}
          localityHasMatch={localityHasMatch}
          setCountyQuery={setCountyQuery}
          setCityQuery={setCityQuery}
          showValidation={showValidation}
          validationAttempt={validationAttempt}
          files={files}
          previews={filePreviews}
          draggingIdx={draggingIdx}
          isDropActive={isDropActive}
          onDropActiveChange={setIsDropActive}
          onFilesSelected={appendFiles}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onMove={moveFile}
          onRemove={removeFile}
          selectedFailedNames={failedUploadNames}
          existingImages={existingImages}
          existingDraggingIdx={draggingExistingIdx}
          onExistingDragStart={handleExistingDragStart}
          onExistingDragOver={handleExistingDragOver}
          onExistingDragEnd={handleExistingDragEnd}
          onExistingMove={moveExistingImage}
          onExistingDelete={handleDeleteExistingImage}
        />

        <input
          type="text"
          value={formData.honeypot}
          onChange={(event) => handleChange('honeypot', event.target.value)}
          className="hidden"
          aria-hidden
        />

        <FormSubmitBar
          uploading={uploading}
          uploadedCount={uploadedCount}
          totalFiles={files.length}
          loading={loading}
          submitLabel={isEditMode ? 'Salveaza modificari' : 'Adauga atractie'}
          loadingLabel="Se salveaza..."
          idleLabel="Verifica datele si galeria, apoi salveaza atractia."
        />

        <ListingSubmitFeedback message={message} tone="error" failedUploads={failedUploads} />
      </form>
    </FormPageShell>
  );
}

export default function AddAttractionPage() {
  return (
    <Suspense
      fallback={
        <FormPageShell
          eyebrow="Formular de publicare pe cabn.ro"
          title="Adauga o atractie"
          description="Pregatim formularul de atractii si incarcam datele necesare pentru administrare."
        >
          <FormPageState title="Se incarca..." description="Pregatim formularul de atractii." />
        </FormPageShell>
      }
    >
      <AddAttractionPageContent />
    </Suspense>
  );
}
