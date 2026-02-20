"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import ListingForm from '@/components/forms/ListingForm';
import LoadingLogo from '@/components/LoadingLogo';
import FormMessage from '@/components/forms/FormMessage';
import useImageSelection from '@/hooks/useImageSelection';
import useImageUploads from '@/hooks/useImageUploads';
import useListingForm from '@/hooks/useListingForm';
import { markPageModified } from '@/hooks/useRefreshOnNavigation';
import { deleteListingImage, reorderListingImages, updateListing } from '@/lib/api/listings';
import { sortFacilitiesByPriority } from '@/lib/facilitiesCatalog';

type FacilityOption = { id: string; name: string };
type ListingImage = { id: string; image_url: string; alt?: string | null };

type FormData = {
  titlu: string;
  judet: string;
  localitate: string;
  sat: string;
  pret: string;
  capacitate: string;
  camere: string;
  paturi: string;
  bai: string;
  descriere: string;
  telefon: string;
  tip: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
  county: string;
  city: string;
};

export default function EditPropertyPage({ params }: any) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = searchParams.get('client') === '1' || searchParams.get('role') === 'client';
  const tokenParam = searchParams.get('token');
  const [listingToken, setListingToken] = useState<string | null>(tokenParam);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    titlu: '',
    judet: '',
    localitate: '',
    sat: '',
    pret: '',
    capacitate: '2',
    camere: '1',
    paturi: '1',
    bai: '1',
    descriere: '',
    telefon: '',
    tip: 'cabana',
  });

  const [facilitiesList, setFacilitiesList] = useState<FacilityOption[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [draggingExistingIdx, setDraggingExistingIdx] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'error' | 'success' | 'info'>('info');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(!isClient);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const { uploading, upload } = useImageUploads({
    onError: (msg) => setMessage(msg),
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
    onLimit: (msg) => setMessage(msg),
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (isClient && !listingToken) return;
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (listingToken) headers['x-listing-token'] = listingToken;

        const resp = await fetch('/api/listing-get', {
          method: 'POST',
          headers,
          body: JSON.stringify({ id }),
        });
        const body = await resp.json().catch(() => null);

        if (!resp.ok) {
          if (!mounted) return;
          if (resp.status === 401) {
            setMessageTone('error');
            setMessage('Link-ul de acces este invalid sau a expirat.');
            return;
          }
          throw new Error(body?.error || 'Nu am putut incarca proprietatea.');
        }

        const { listing, images: imgs, facilities: selected } = body || {};
        const { data: facilities } = await supabase.from('facilities').select('id, name');

        if (!mounted) return;

        if (listing) {
          const localitate = listing.city || '';
          const sat = listing.sat || '';
          const judetValue = listing.judet || '';
          setFormData({
            titlu: listing.title || '',
            judet: judetValue,
            localitate,
            sat,
            pret: listing.price?.toString() || '',
            capacitate: (listing.capacity || 1).toString(),
            camere: (listing.camere ?? 0).toString(),
            paturi: (listing.paturi ?? 0).toString(),
            bai: (listing.bai ?? 0).toString(),
            descriere: listing.description || '',
            telefon: listing.phone || '',
            tip: listing.type || 'cabana',
          });
          const latValue = listing.lat ?? listing.latitude;
          const lngValue = listing.lng ?? listing.longitude;
          const parsedLat =
            typeof latValue === 'number' ? latValue : latValue ? parseFloat(String(latValue)) : 0;
          const parsedLng =
            typeof lngValue === 'number' ? lngValue : lngValue ? parseFloat(String(lngValue)) : 0;
          setLocationData({
            latitude: Number.isFinite(parsedLat) ? parsedLat : 0,
            longitude: Number.isFinite(parsedLng) ? parsedLng : 0,
            county: judetValue,
            city: localitate,
          });
          setNewsletterOptIn(Boolean((listing as any).newsletter_opt_in));
          setAcceptedTerms(Boolean((listing as any).terms_accepted));
        }
        setMessage(null);

        if (facilities) setFacilitiesList(sortFacilitiesByPriority(facilities as FacilityOption[]));
        if (selected) setSelectedFacilities(Array.isArray(selected) ? selected : (selected || []));
        if (imgs) setImages(imgs as ListingImage[]);
      } catch (err) {
        console.error('Load error:', err);
      }
    }

    load();
    return () => { mounted = false; };
  }, [id, isClient, listingToken]);

  useEffect(() => {
    setAcceptedTerms(!isClient);
  }, [isClient]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (tokenParam) {
      setListingToken(tokenParam);
      try {
        sessionStorage.setItem('listing_token', tokenParam);
      } catch {
        // ignore storage issues
      }
      if (!isClient) {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete('token');
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `/edit-property/${id}?${nextQuery}` : `/edit-property/${id}`);
      }
      return;
    }

    if (!listingToken) {
      try {
        const stored = sessionStorage.getItem('listing_token');
        if (stored) setListingToken(stored);
      } catch {
        // ignore storage issues
      }
    }
  }, [tokenParam, searchParams, router, listingToken, id, isClient]);

  const handleChange = (k: keyof FormData, v: string) => {
    setFormData(prev => ({ ...prev, [k]: v }));
  };
  const handleLocationSelect = (location: LocationData) => {
    setLocationData(location);
  };

  const toggleFacility = (idf: string) => {
    setSelectedFacilities(prev => prev.includes(idf) ? prev.filter(x => x !== idf) : [...prev, idf]);
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

  const moveImage = (from: number, to: number) => {
    setImages(prev => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };
  const handleExistingDragStart = (idx: number) => setDraggingExistingIdx(idx);
  const handleExistingDragOver = (idx: number) => {
    if (draggingExistingIdx === null || draggingExistingIdx === idx) return;
    moveImage(draggingExistingIdx, idx);
    setDraggingExistingIdx(idx);
  };
  const handleExistingDragEnd = () => setDraggingExistingIdx(null);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setShowValidation(true);
    if (validationError) {
      setMessageTone('error');
      setMessage(invalidFields.length === 0 ? validationError : null);
      setValidationAttempt((prev) => prev + 1);
      return;
    }
    if (isClient && !acceptedTerms) {
      setMessageTone('error');
      setMessage('Te rugam sa accepti termenii si conditiile.');
      return;
    }
    const hasCoords =
      locationData !== null &&
      Number.isFinite(locationData.latitude) &&
      Number.isFinite(locationData.longitude) &&
      (locationData.latitude !== 0 || locationData.longitude !== 0);

    setLoading(true);
    try {
      // Upload new images if present
      let updatedImages = images;
      if (files.length > 0) {
        const { uploaded } = await upload(id, files, images.length, listingToken);
        if (uploaded.length > 0) {
          updatedImages = [...images, ...uploaded.map(u => ({ id: u.id, image_url: u.url, alt: null }))];
          setImages(updatedImages);
        }
        resetFiles();
      }

      // Update listing with location data
      const updatePayload = {
        id,
        title: formData.titlu,
        judet: formData.judet || locationData?.county || null,
        city: formData.localitate || locationData?.city || null,
        sat: formData.sat || null,
        price: Number(formData.pret) || 0,
        capacity: formData.capacitate || '1',
        camere: Number(formData.camere) || 0,
        paturi: Number(formData.paturi) || 0,
        bai: Number(formData.bai) || 0,
        phone: formData.telefon,
        description: formData.descriere,
        type: formData.tip,
        facilities: selectedFacilities,
        lat: hasCoords ? Number(locationData?.latitude ?? null) : null,
        lng: hasCoords ? Number(locationData?.longitude ?? null) : null,
      };
      if (isClient) {
        (updatePayload as any).newsletter_opt_in = newsletterOptIn;
        (updatePayload as any).terms_accepted = acceptedTerms;
      }
      await updateListing(updatePayload, listingToken);

      // Persist image order
      if (updatedImages.length > 0) {
        const idsInOrder = updatedImages.map(img => img.id);
        await reorderListingImages(id, idsInOrder, listingToken);
      }

      setMessageTone('success');
      setMessage('Modificările au fost salvate.');
      markPageModified();
      if (isClient) {
        router.push('/?updated=1');
      } else {
        router.push('/drafts?updated=1');
      }
    } catch (err) {
      console.error(err);
      setMessageTone('error');
      setMessage(err instanceof Error ? err.message : 'A apărut o eroare');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      {(loading || uploading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-black/70 backdrop-blur-sm">
          <LoadingLogo />
        </div>
      )}
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">Administrare listare</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold mt-2">Editează cabana</h1>
          {!isClient && (
            <Link
              href="/drafts"
              prefetch={false}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              Înapoi la listări
            </Link>
          )}
        </div>
        <p className="text-gray-600 mt-1">Actualizează detaliile și gestionează ordinea galeriilor înainte de publicare.</p>
      </div>

      <form onSubmit={handleUpdate} noValidate className="space-y-8">
        <p className="text-sm text-gray-600">Toate câmpurile sunt obligatorii, cu excepția celor marcate (opțional).</p>
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
          dropzoneTitle={
            isClient
              ? "Încarcă imagini noi (minim 5, maxim 20 total)"
              : "Încarcă imagini noi (maxim 20 total)"
          }
          dropzoneSubtitle={
            isClient
              ? "Selectează fișiere și ordonează-le înainte de publicare"
              : "Selectează fișiere și ordonează-le"
          }
          dropzoneHelper="Click pentru a selecta"
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
              ? "Stabilește ordinea de afișare pentru încărcare (5-20 imagini total)"
              : "Stabilește ordinea de afișare pentru încărcare (maxim 20 imagini total)"
          }
          maxImagesWarning={20}
          existingImages={images}
          existingTitle="Galerie publicată"
          existingSubtitle="Reordonează sau șterge imaginile curente"
          existingDraggingIdx={draggingExistingIdx}
          onExistingDragStart={handleExistingDragStart}
          onExistingDragOver={handleExistingDragOver}
          onExistingDragEnd={handleExistingDragEnd}
          onExistingMove={moveImage}
          onExistingDelete={async (img) => {
            try {
              await deleteListingImage(img.id, listingToken);
              setImages(prev => prev.filter(it => it.id !== img.id));
            } catch (err) {
              setMessageTone('error');
              setMessage(err instanceof Error ? err.message : 'Nu am putut sterge imaginea.');
            }
          }}
          descriptionMin={200}
          descriptionMax={1000}
          descriptionRequired={isClient}
        />

        {isClient && (
          <div className="space-y-2">
            <label
              className={`flex items-start gap-2 text-sm ${
                showValidation && !acceptedTerms ? 'text-red-700' : 'text-gray-700'
              }`}
            >
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                Accept termenii si conditiile<span className="text-red-600"> *</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={newsletterOptIn}
                onChange={(e) => setNewsletterOptIn(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Ma alatur newsletterului/comunitatii cabn.</span>
            </label>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="text-sm text-gray-600">
            {uploading ? `Se încarcă imaginile... ${(images.length + files.length)}/${files.length}` : 'Verifică datele și salvează modificările.'}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              href="/drafts"
              className="w-full sm:w-auto text-center px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Anulează
            </Link>
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Se salvează...' : 'Salvează modificări'}
            </button>
          </div>
        </div>

        {message && (
          <FormMessage variant={messageTone === 'success' ? 'success' : 'error'} role="status" aria-live="polite">
            {message}
          </FormMessage>
        )}
      </form>
    </div>
  )
}
