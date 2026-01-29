"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import ListingForm from '@/components/forms/ListingForm';
import useImageSelection from '@/hooks/useImageSelection';
import useImageUploads from '@/hooks/useImageUploads';
import useListingForm from '@/hooks/useListingForm';
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

const splitAddress = (address: string) => {
  const trimmed = address.trim();
  const match = trimmed.match(/^(.*)\s*\((.*)\)\s*$/);
  if (match) {
    return { localitate: match[1].trim(), sat: match[2].trim() };
  }
  return { localitate: trimmed, sat: '' };
};

export default function EditPropertyPage({ params }: any) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = searchParams.get('client') === '1' || searchParams.get('role') === 'client';
  
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
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(!isClient);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const { uploading, upload } = useImageUploads({
    onError: (msg) => setMessage(msg),
    clientMode: isClient,
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
    maxFiles: Math.max(0, 10 - images.length),
    onLimit: (msg) => setMessage(msg),
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/listing-get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const { listing, images: imgs, facilities: selected } = await resp.json();
        const { data: facilities } = await supabase.from('facilities').select('id, name');

        if (!mounted) return;

        if (listing) {
          const { localitate, sat } = splitAddress(listing.address || '');
          setFormData({
            titlu: listing.title || '',
            judet: listing.location || '',
            localitate,
            sat,
            pret: listing.price?.toString() || '',
            capacitate: (listing.capacity || 1).toString(),
            camere: (listing.camere ?? listing.rooms ?? listing.num_camere ?? listing.num_rooms ?? listing.bedrooms ?? 0).toString(),
            paturi: (listing.paturi ?? listing.beds ?? listing.num_paturi ?? listing.num_beds ?? listing.pat ?? 0).toString(),
            bai: (listing.bai ?? listing.bathrooms ?? listing.num_bai ?? listing.num_bathrooms ?? listing.bath ?? 0).toString(),
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
            county: listing.location || '',
            city: localitate,
          });
        }

        if (facilities) setFacilitiesList(sortFacilitiesByPriority(facilities as FacilityOption[]));
        if (selected) setSelectedFacilities(Array.isArray(selected) ? selected : (selected || []));
        if (imgs) setImages(imgs as ListingImage[]);
      } catch (err) {
        console.error('Load error:', err);
      }
    }

    load();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    setAcceptedTerms(!isClient);
  }, [isClient]);

  const handleChange = (k: keyof FormData, v: string) => {
    setFormData(prev => ({ ...prev, [k]: v }));
  };

  const toggleFacility = (idf: string) => {
    setSelectedFacilities(prev => prev.includes(idf) ? prev.filter(x => x !== idf) : [...prev, idf]);
  };

  const { error: validationError, invalidFields, imagesInvalid } = useListingForm({
    requiredFields: [
      { key: 'titlu', value: formData.titlu, label: 'Titlu' },
      { key: 'judet', value: formData.judet, label: 'Jude?' },
      { key: 'localitate', value: formData.localitate, label: 'Localitate' },
      { key: 'pret', value: formData.pret, label: 'Pre?' },
      { key: 'capacitate', value: formData.capacitate, label: 'Capacitate' },
      { key: 'telefon', value: formData.telefon, label: 'Telefon' },
    ],
    phone: formData.telefon,
    phoneKey: 'telefon',
    imagesCount: images.length + files.length,
    minImages: 5,
    maxImages: 10,
    description: formData.descriere,
    descriptionKey: 'descriere',
    descriptionMin: 200,
    descriptionMax: 320,
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
      setMessage(validationError);
      setValidationAttempt((prev) => prev + 1);
      return;
    }
    if (isClient && !acceptedTerms) {
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
        const { uploaded } = await upload(id, files, images.length);
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
        location: locationData?.county || formData.judet,
        address:
          (locationData?.city || formData.localitate)
            ? `${locationData?.city || formData.localitate}${formData.sat ? ` (${formData.sat})` : ''}`
            : null,
        price: Number(formData.pret) || 0,
        capacity: Number(formData.capacitate) || 1,
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
      await updateListing(updatePayload);

      // Persist image order
      if (updatedImages.length > 0) {
        const idsInOrder = updatedImages.map(img => img.id);
        await reorderListingImages(id, idsInOrder);
      }

      setMessage('Modificările au fost salvate.');
      router.push('/drafts?updated=1');
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : 'A apărut o eroare');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
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
          onLocationSelect={(location) => setLocationData(location)}
          initialCounty={formData.judet}
          initialCity={formData.localitate}
          initialLat={locationData?.latitude ?? null}
          initialLng={locationData?.longitude ?? null}
          dropzoneTitle="Încarcă imagini noi (minim 5, maxim 10 total)"
          dropzoneSubtitle="Selectează fișiere și ordonează-le înainte de publicare"
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
          selectedImagesTitle="Imagini noi (nepublicate inca)"
          selectedImagesSubtitle="Ordinea de mai jos va fi folosita la incarcare (5-10 imagini total)"
          existingImages={images}
          existingTitle="Galerie existenta"
          existingSubtitle="Reordoneaza sau sterge imaginile curente"
          existingDraggingIdx={draggingExistingIdx}
          onExistingDragStart={handleExistingDragStart}
          onExistingDragOver={handleExistingDragOver}
          onExistingDragEnd={handleExistingDragEnd}
          onExistingMove={moveImage}
          onExistingDelete={async (img) => {
            await deleteListingImage(img.id);
            setImages(prev => prev.filter(it => it.id !== img.id));
          }}
          descriptionMin={200}
          descriptionMax={320}
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
              <span>Accept termenii si conditiile.</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={newsletterOptIn}
                onChange={(e) => setNewsletterOptIn(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Ma alatur newsletterului/comunitatii CABN.</span>
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

        {message && <div className="text-sm text-gray-700" role="status" aria-live="polite">{message}</div>}
      </form>
    </div>
  )
}

