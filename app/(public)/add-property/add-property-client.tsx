'use client';

import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';
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
import {
  createListing,
  deleteListingImage,
  reorderListingImages,
  updateListing,
} from '@/lib/api/listings';
import { sortFacilitiesByPriority } from '@/lib/facilitiesCatalog';
import {
  buildListingPayloadBase,
  createEmptyListingFormFields,
  type ExistingImage as ListingImage,
  type FacilityOption,
  type ListingFormFields,
  type LocationData,
  withClientListingMeta,
} from '@/lib/listings/listingForm';
import { slugify } from '@/lib/utils';

type SimpleForm = ReturnType<typeof createInitialAddPropertyForm>;
type UploadResult = { id: string; url: string; display_order: number };

function createPendingImageId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function moveToken(tokens: string[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= tokens.length || toIndex >= tokens.length) {
    return tokens;
  }

  const next = [...tokens];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function createInitialAddPropertyForm() {
  return {
    ...createEmptyListingFormFields(),
    honeypot: '',
  };
}

function mapUploadedImages(uploaded: UploadResult[], previewUrls: string[] = []): ListingImage[] {
  return uploaded.map((item, index) => ({
    id: item.id,
    image_url: item.url,
    alt: null,
    preview_url: previewUrls[index] || null,
  }));
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
  const [draftListingId, setDraftListingId] = useState<string | null>(null);
  const [draftListingToken, setDraftListingToken] = useState<string | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [galleryOrder, setGalleryOrder] = useState<string[]>([]);
  const [draggingExistingIdx, setDraggingExistingIdx] = useState<number | null>(null);
  const {
    message,
    tone,
    failedUploads,
    failedUploadNames,
    clearFeedback,
    setError,
    setErrorFromUnknown,
    setInfo,
    setUploadError,
  } = useSubmissionFeedback('error');

  const { uploading, uploadedCount, upload } = useImageUploads({
    onError: () => {
      // Background uploads surface detailed errors through setUploadError.
    },
  });

  const {
    files,
    filePreviews,
    draggingIdx,
    isDropActive,
    setIsDropActive,
    moveFile,
    removeFile,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    resetFiles,
    setFiles,
  } = useImageSelection({
    maxFiles: Number.POSITIVE_INFINITY,
    onLimit: (nextMessage) => setError(nextMessage),
  });

  const imagesRef = useRef<ListingImage[]>([]);
  const filesRef = useRef<File[]>([]);
  const filePreviewsRef = useRef<string[]>([]);
  const pendingIdsRef = useRef<string[]>([]);
  const galleryOrderRef = useRef<string[]>([]);
  const draftSeedPromiseRef = useRef<Promise<{ id: string; token: string | null }> | null>(null);
  const uploadPromiseRef = useRef<Promise<void> | null>(null);
  const processPendingFilesRef = useRef<((options: { background: boolean }) => Promise<void> | void) | null>(null);
  const pausedBackgroundQueueRef = useRef<string | null>(null);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    filePreviewsRef.current = filePreviews;
  }, [filePreviews]);

  useEffect(() => {
    pendingIdsRef.current = pendingIds;
  }, [pendingIds]);

  useEffect(() => {
    galleryOrderRef.current = galleryOrder;
  }, [galleryOrder]);

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

  const updateImages = (updater: (prev: ListingImage[]) => ListingImage[]) => {
    setImages((prev) => {
      const next = updater(prev);
      imagesRef.current = next;
      return next;
    });
  };

  const syncPendingQueueWithOrder = (nextOrder: string[]) => {
    const currentFiles = filesRef.current;
    const currentPendingIds = pendingIdsRef.current;
    if (currentFiles.length !== currentPendingIds.length) return;

    const fileByPendingId = new Map(currentPendingIds.map((id, index) => [id, currentFiles[index]] as const));
    const nextPendingIds = nextOrder
      .filter((token) => token.startsWith('pending:'))
      .map((token) => token.slice('pending:'.length))
      .filter((id) => fileByPendingId.has(id));

    const nextFiles = nextPendingIds.map((id) => fileByPendingId.get(id)).filter((file): file is File => Boolean(file));
    if (nextFiles.length !== nextPendingIds.length) return;

    pendingIdsRef.current = nextPendingIds;
    filesRef.current = nextFiles;
    setPendingIds(nextPendingIds);
    setFiles(nextFiles);
  };

  const syncSavedImagesWithOrder = (nextOrder: string[]) => {
    const imageById = new Map(imagesRef.current.map((image) => [image.id, image] as const));
    const nextImages = nextOrder
      .filter((token) => token.startsWith('saved:'))
      .map((token) => token.slice('saved:'.length))
      .map((id) => imageById.get(id))
      .filter((image): image is ListingImage => Boolean(image));

    imagesRef.current = nextImages;
    setImages(nextImages);
  };

  const applyGalleryOrder = (updater: (prev: string[]) => string[]) => {
    const next = updater(galleryOrderRef.current);
    galleryOrderRef.current = next;
    setGalleryOrder(next);
    syncPendingQueueWithOrder(next);
    syncSavedImagesWithOrder(next);
  };

  const replacePendingQueue = (nextPendingIds: string[]) => {
    const fileByPendingId = new Map(
      pendingIdsRef.current.map((id, index) => [id, filesRef.current[index]] as const)
    );
    const nextFiles = nextPendingIds
      .map((id) => fileByPendingId.get(id))
      .filter((file): file is File => Boolean(file));

    pendingIdsRef.current = nextPendingIds;
    filesRef.current = nextFiles;
    setPendingIds(nextPendingIds);
    setFiles(nextFiles);
  };

  const getPendingQueueSignature = (pendingQueue: string[]) => pendingQueue.join('|');

  const appendUploadedImages = (
    uploaded: UploadResult[],
    pendingIdMatches: string[] = [],
    previewUrls: string[] = []
  ) => {
    if (uploaded.length === 0) return;
    const mapped = mapUploadedImages(uploaded, previewUrls);
    updateImages((prev) => [...prev, ...mapped]);
    applyGalleryOrder((prev) => {
      let next = [...prev];
      mapped.forEach((image, index) => {
        const pendingId = pendingIdMatches[index];
        const pendingToken = pendingId ? `pending:${pendingId}` : null;
        const savedToken = `saved:${image.id}`;
        if (pendingToken) {
          const tokenIndex = next.indexOf(pendingToken);
          if (tokenIndex !== -1) {
            next[tokenIndex] = savedToken;
            return;
          }
        }
        next.push(savedToken);
      });
      return next;
    });
  };

  const ensureDraftListing = async () => {
    if (draftListingId) return { id: draftListingId, token: draftListingToken };
    if (draftSeedPromiseRef.current) return draftSeedPromiseRef.current;

    draftSeedPromiseRef.current = (async () => {
      const draftPayload = withClientListingMeta(
        {
          title: formData.titlu || 'Draft proprietate',
          slug: slugify(formData.titlu || 'Draft proprietate') || 'cazare',
          ...buildListingPayloadBase(formData, locationData),
          is_published: false,
          draft_seed: true,
        },
        { isClient, newsletterOptIn, acceptedTerms }
      );

      const created = await createListing(draftPayload, selectedFacilities, inviteToken);
      const nextId = created.id;
      const nextToken = created.editToken || null;
      setDraftListingId(nextId);
      setDraftListingToken(nextToken);
      return { id: nextId, token: nextToken };
    })().finally(() => {
      draftSeedPromiseRef.current = null;
    });

    return draftSeedPromiseRef.current;
  };

  const processPendingFiles = async ({ background }: { background: boolean }) => {
    if (uploadPromiseRef.current) {
      return uploadPromiseRef.current;
    }

    const snapshot = filesRef.current.slice();
    if (snapshot.length === 0) return;

    uploadPromiseRef.current = (async () => {
      const draft = await ensureDraftListing();
      const startIndex = imagesRef.current.length;
      const previewSnapshot = filePreviewsRef.current.slice(0, snapshot.length);
      const pendingIdSnapshot = pendingIdsRef.current.slice(0, snapshot.length);

      try {
        if (background) {
          setInfo('Incarcam imaginile in fundal pe draftul proprietatii.');
        }

        const result = await upload(draft.id, snapshot, startIndex, draft.token);
        appendUploadedImages(result.uploaded as UploadResult[], pendingIdSnapshot, previewSnapshot);
        replacePendingQueue(pendingIdsRef.current.filter((id) => !pendingIdSnapshot.includes(id)));
        pausedBackgroundQueueRef.current = null;
        clearFeedback();
      } catch (error: any) {
        const uploadedPartial = Array.isArray(error?.uploaded) ? (error.uploaded as UploadResult[]) : [];
        const uploadedIndices = Array.isArray(error?.uploadedIndices) ? (error.uploadedIndices as number[]) : [];
        const uploadedPendingIds = uploadedIndices.map((index) => pendingIdSnapshot[index]).filter(Boolean);
        const uploadedPreviews = uploadedIndices.map((index) => previewSnapshot[index] || '');
        appendUploadedImages(uploadedPartial, uploadedPendingIds, uploadedPreviews);
        replacePendingQueue(pendingIdsRef.current.filter((id) => !uploadedPendingIds.includes(id)));
        pausedBackgroundQueueRef.current = getPendingQueueSignature(pendingIdsRef.current);

        setUploadError(error);

        if (!background) {
          throw error;
        }
      } finally {
        uploadPromiseRef.current = null;
      }
    })();

    return uploadPromiseRef.current;
  };

  useEffect(() => {
    processPendingFilesRef.current = processPendingFiles;
  });

  useEffect(() => {
    if (!draftListingId || files.length === 0 || uploadPromiseRef.current) return;
    if (pausedBackgroundQueueRef.current === getPendingQueueSignature(pendingIdsRef.current)) return;
    void processPendingFilesRef.current?.({ background: true });
  }, [draftListingId, files]);

  const handleChange = (key: keyof ListingFormFields, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleLocationSelect = (location: LocationData) => {
    setLocationData(location);
  };

  const handleFilesSelected = (incoming: File[]) => {
    if (incoming.length === 0) return;
    clearFeedback();
    const maxImages = 20;
    const remainingSlots = Math.max(0, maxImages - (imagesRef.current.length + filesRef.current.length));
    if (remainingSlots <= 0) {
      setError(`Poti incarca maximum ${maxImages} imagini.`);
      return;
    }

    const acceptedFiles = incoming.slice(0, remainingSlots);
    if (acceptedFiles.length < incoming.length) {
      setError(`Poti incarca maximum ${maxImages} imagini.`);
    }

    if (acceptedFiles.length === 0) return;

    const nextPendingIds = acceptedFiles.map(() => createPendingImageId());
    pausedBackgroundQueueRef.current = null;
    setFiles((prev) => {
      const next = [...prev, ...acceptedFiles];
      filesRef.current = next;
      return next;
    });
    setPendingIds((prev) => {
      const next = [...prev, ...nextPendingIds];
      pendingIdsRef.current = next;
      return next;
    });
    setGalleryOrder((prev) => {
      const next = [...prev, ...nextPendingIds.map((id) => `pending:${id}`)];
      galleryOrderRef.current = next;
      return next;
    });
    void ensureDraftListing().catch((error) => {
      setErrorFromUnknown(error, 'Nu am putut pregati draftul pentru uploadul imaginilor.');
    });
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
    imagesCount: files.length + images.length,
    minImages: isClient ? 5 : 0,
    maxImages: 20,
    description: formData.descriere,
    descriptionKey: 'descriere',
    descriptionMin: 200,
    descriptionMax: 1000,
    enforceDescription: isClient,
  });

  const moveExistingImage = (from: number, to: number) => {
    updateImages((prev) => {
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

  const moveGalleryTokenByDirection = (token: string, direction: -1 | 1) => {
    applyGalleryOrder((prev) => {
      const fromIndex = prev.indexOf(token);
      const toIndex = fromIndex + direction;
      return moveToken(prev, fromIndex, toIndex);
    });
  };

  const moveGalleryTokenToIndex = (token: string, toIndex: number) => {
    applyGalleryOrder((prev) => moveToken(prev, prev.indexOf(token), toIndex));
  };

  const handleDeleteGalleryToken = async (token: string) => {
    if (token.startsWith('saved:')) {
      const imageId = token.slice('saved:'.length);
      const image = imagesRef.current.find((item) => item.id === imageId);
      if (!image) return;
      const deleted = await handleDeleteExistingImage(image);
      if (!deleted) return;
      applyGalleryOrder((prev) => prev.filter((item) => item !== token));
      return;
    }

    if (!token.startsWith('pending:')) return;

    const pendingId = token.slice('pending:'.length);
    const pendingIndex = pendingIdsRef.current.indexOf(pendingId);
    if (pendingIndex === -1) return;

    pausedBackgroundQueueRef.current = null;
    setFiles((prev) => {
      const next = prev.filter((_, index) => index !== pendingIndex);
      filesRef.current = next;
      return next;
    });
    setPendingIds((prev) => {
      const next = prev.filter((id) => id !== pendingId);
      pendingIdsRef.current = next;
      return next;
    });
    setGalleryOrder((prev) => {
      const next = prev.filter((item) => item !== token);
      galleryOrderRef.current = next;
      return next;
    });
  };

  const handleDeleteExistingImage = async (image: ListingImage) => {
    if (!draftListingToken) {
      setError('Nu am putut identifica tokenul draftului pentru stergerea imaginii.');
      return false;
    }

    try {
      await deleteListingImage(image.id, draftListingToken);
      updateImages((prev) => prev.filter((item) => item.id !== image.id));
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nu am putut sterge imaginea.');
      return false;
    }
  };

  const resetDraftState = () => {
    setDraftListingId(null);
    setDraftListingToken(null);
    setImages([]);
    imagesRef.current = [];
    pausedBackgroundQueueRef.current = null;
    setPendingIds([]);
    pendingIdsRef.current = [];
    setGalleryOrder([]);
    galleryOrderRef.current = [];
    setDraggingExistingIdx(null);
  };

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

      let listingId: string;
      let listingToken: string | null;

      if (draftListingId || filesRef.current.length > 0) {
        const draft = await ensureDraftListing();
        listingId = draft.id;
        listingToken = draft.token;

        if (uploadPromiseRef.current) {
          await uploadPromiseRef.current;
        }
        if (filesRef.current.length > 0) {
          await processPendingFiles({ background: false });
        }

        await updateListing(
          {
            id: listingId,
            ...payload,
            facilities: selectedFacilities,
          },
          listingToken
        );
      } else {
        const created = await createListing(payload, selectedFacilities, inviteToken);
        listingId = created.id;
        listingToken = created.editToken || null;
      }

      const orderedImageIds = galleryOrderRef.current
        .filter((token) => token.startsWith('saved:'))
        .map((token) => token.slice('saved:'.length));

      if (orderedImageIds.length > 0) {
        await reorderListingImages(
          listingId,
          orderedImageIds,
          listingToken
        );
      }

      markPageModified();
      if (isClient) router.push('/?submitted=1');
      else router.push(`/drafts?created=1&id=${listingId}`);

      setFormData(createInitialAddPropertyForm());
      setSelectedFacilities([]);
      resetFiles();
      resetDraftState();
    } catch (error: any) {
      if (Array.isArray(error?.failed)) {
        setUploadError(error);
      } else {
        setErrorFromUnknown(error);
      }
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
          Toate campurile sunt obligatorii, cu exceptia celor marcate ca optionale. Proprietatile trimise de clienti
          intra in revizie inainte de publicare.
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
          onFilesSelected={handleFilesSelected}
          files={files}
          previews={filePreviews}
          draggingIdx={draggingIdx}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onMove={moveFile}
          onRemove={removeFile}
          selectedImagesLocked={uploading}
          galleryOrder={galleryOrder}
          pendingImageIds={pendingIds}
          onMoveGalleryToken={moveGalleryTokenByDirection}
          onReorderGalleryToken={moveGalleryTokenToIndex}
          onDeleteGalleryToken={handleDeleteGalleryToken}
          selectedImagesTitle="Imagini in asteptare pentru upload"
          selectedImagesSubtitle="Ordinea de aici devine ordinea de upload pentru fisierele noi"
          selectedFailedNames={failedUploadNames}
          existingImages={images}
          existingTitle="Galeria deja incarcata pe draft"
          existingSubtitle="Reordoneaza sau sterge imaginile deja urcate inainte de trimiterea finala"
          existingDraggingIdx={draggingExistingIdx}
          onExistingDragStart={handleExistingDragStart}
          onExistingDragOver={handleExistingDragOver}
          onExistingDragEnd={handleExistingDragEnd}
          onExistingMove={moveExistingImage}
          onExistingDelete={handleDeleteExistingImage}
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
          idleLabel="Imaginile se urca pe draft in fundal. Cand totul arata bine, trimite proprietatea."
        />

        <ListingSubmitFeedback message={message} tone={tone} failedUploads={failedUploads} />
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
