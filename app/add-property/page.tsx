'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ListingForm from '@/components/forms/ListingForm';
import useImageSelection from '@/hooks/useImageSelection';
import useImageUploads from '@/hooks/useImageUploads';
import useListingForm from '@/hooks/useListingForm';
import { createListing, deleteListing } from '@/lib/api/listings';

type FacilityOption = { id: string; name: string };

type SimpleForm = {
  titlu: string;
  judet: string;
  localitate: string;
  pret: string; // keep as string for easy input
  capacitate: string;
  descriere: string;
  telefon: string;
  tip: string;
  // file uploads handled through server endpoint; no thumbnail_url or image_urls field
  honeypot: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
  county: string;
  city: string;
  radius: number;
};

function AddPropertyPageContent() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('token');
  const [formData, setFormData] = useState<SimpleForm>({
    titlu: '',
    judet: '',
    localitate: '',
    pret: '',
    capacitate: '2',
    descriere: '',
    telefon: '',
    tip: 'cabana',
    // no thumbnail/image_urls
    honeypot: '',
  });

  const [facilitiesList, setFacilitiesList] = useState<FacilityOption[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failedUploads, setFailedUploads] = useState<Array<{ name: string; reason: string }>>([]);
  const [showValidation, setShowValidation] = useState(false);
  const router = useRouter();
  const { uploading, uploadedCount, upload } = useImageUploads({
    onError: (msg) => setMessage(msg),
    inviteToken,
  });
  const [locationData, setLocationData] = useState<LocationData | null>(null);
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
    maxFiles: 10,
    onLimit: (msg) => setMessage(msg),
  });

  useEffect(() => {
    let mounted = true;
    async function fetchFacilities() {
      try {
        const { data } = await supabase.from('facilities').select('id, name');
        if (mounted && data) setFacilitiesList(data as FacilityOption[]);
      } catch (e) {
        // ignore
      }
    }
    fetchFacilities();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (k: keyof SimpleForm, v: string) => setFormData(prev => ({ ...prev, [k]: v }));

  const toggleFacility = (id: string) =>
    setSelectedFacilities((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const { error: validationError, invalidFields, imagesInvalid } = useListingForm({
    requiredFields: [
      { key: 'titlu', value: formData.titlu, label: 'Titlu' },
      { key: 'judet', value: formData.judet, label: 'Judet' },
      { key: 'localitate', value: formData.localitate, label: 'Localitate' },
      { key: 'pret', value: formData.pret, label: 'Pret' },
      { key: 'capacitate', value: formData.capacitate, label: 'Capacitate' },
      { key: 'telefon', value: formData.telefon, label: 'Telefon' },
    ],
    phone: formData.telefon,
    phoneKey: 'telefon',
    imagesCount: files.length,
    minImages: 5,
    maxImages: 10,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFailedUploads([]);
    setShowValidation(true);
    if (formData.honeypot) return; // spam
    if (validationError) {
      setMessage(validationError);
      return;
    }
    const hasCoords =
      locationData !== null &&
      Number.isFinite(locationData.latitude) &&
      Number.isFinite(locationData.longitude) &&
      (locationData.latitude !== 0 || locationData.longitude !== 0);

    // no external image URLs or thumbnail

    setLoading(true);
    try {
      const safeBaseSlug = formData.titlu
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const uniqueSuffix = Math.random().toString(36).slice(2, 6);
      const payload = {
        title: formData.titlu,
        slug: `${safeBaseSlug}-${uniqueSuffix}`,
        // store county in `location` and city/village in `address`
        location: locationData?.county || formData.judet,
        address: locationData?.city || formData.localitate || null,
        price: Number(formData.pret) || 0,
        capacity: Number(formData.capacitate) || 1,
        phone: formData.telefon || null,
        type: formData.tip,
        description: formData.descriere || null,
        // Location data from Google Maps
        lat: hasCoords ? Number(locationData?.latitude ?? null) : null,
        lng: hasCoords ? Number(locationData?.longitude ?? null) : null,
        search_radius: locationData?.radius ?? 1,
        // images uploaded separately
        is_published: false,
        display_order: null,
      };
      // create listing via server endpoint to avoid RLS errors
      const { id: listingId } = await createListing(payload, selectedFacilities, inviteToken);

      // upload selected files to server endpoint which will use server-side supabase Admin
      if (files.length > 0) {
        try {
          await upload(listingId, files, 0);
        } catch (err: any) {
          try {
            await deleteListing(listingId);
          } catch {
            // ignore rollback errors
          }
          const failed = Array.isArray(err?.failed) ? err.failed : [];
          setFailedUploads(failed);
          setMessage(
            failed.length > 0
              ? 'Nu s-au incarcat toate imaginile.'
              : err?.message || 'Eroare la incarcarea imaginilor'
          );
          return;
        }
      }

      setMessage(`Anunt creat cu id ${listingId}.`);
      try {
        router.push(`/confirmaction=created&id=${listingId}&status=draft`);
      } catch (err) {
        // ignore if router unavailable
      }
      setFormData({ titlu: '', judet: '', localitate: '', pret: '', capacitate: '2', descriere: '', telefon: '', tip: 'cabana', honeypot: '' });
      setSelectedFacilities([]);
      resetFiles();
    } catch (err: any) {
      setMessage(err.message || 'A aparut o eroare');
    } finally {
      setLoading(false);
    }
  };

  if (!inviteToken) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold mb-2">Acces restrictionat</h1>
        <p className="text-gray-600">Ai nevoie de un link valid pentru a adauga o proprietate.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">Formular de publicare pe cabn.ro</p>
        <h1 className="text-3xl font-semibold mt-2">Adauga o proprietate</h1>
        <p className="text-gray-600 mt-1">Completeaza detaliile si ataseaza continutul foto-video.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <p className="text-sm text-gray-600">Toate campurile sunt obligatorii, cu exceptia celor marcate (optional).</p>
        <ListingForm
          formData={formData}
          onChange={handleChange}
          facilities={facilitiesList}
          selectedFacilities={selectedFacilities}
          onToggleFacility={toggleFacility}
          onLocationSelect={(location) => setLocationData(location)}
          initialCounty={formData.judet}
          initialCity={formData.localitate}
          dropzoneTitle="Incarca imagini (minim 5, maxim 10)"
          dropzoneSubtitle="Accepta .jpg, .png, .webp, .avif, .heic"
          dropzoneHelper="Click sau trage imaginile aici"
          showValidation={showValidation}
          invalidFields={invalidFields}
          imagesInvalid={imagesInvalid}
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
          selectedImagesTitle="Galeria imaginilor adaugate"
          selectedImagesSubtitle="Foloseste sagetile pentru a reordona (5-10 imagini)"
          selectedFailedNames={failedUploads.map((f) => f.name)}
        />

        {/* honeypot */}
        <input type="text" value={formData.honeypot} onChange={e => handleChange('honeypot', e.target.value)} className="hidden" aria-hidden />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="text-sm text-gray-600">
            {uploading
              ? `Se incarca imaginile... ${uploadedCount}/${files.length}`
              : 'Verifica datele si foloseste butonul de creare.'}
          </div>
          <button type="submit" disabled={loading || uploading} className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow hover:bg-emerald-700 disabled:opacity-60">
            {loading ? 'Se salveaza...' : 'Creeaza cabana'}
          </button>
        </div>

        {message && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="status" aria-live="polite">
            <div className="font-semibold">{message}</div>
            {failedUploads.length > 0 && (
              <ul className="mt-2 space-y-1 text-red-700">
                {failedUploads.map((f, idx) => (
                  <li key={`${f.name}-${idx}`} className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span>
                      <span className="font-medium">{f.name}</span>
                      {f.reason ? ` — ${f.reason}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

export default function AddPropertyPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-2xl font-semibold mb-2">Se incarca...</h1>
          <p className="text-gray-600">Pregatim formularul de publicare.</p>
        </div>
      }
    >
      <AddPropertyPageContent />
    </Suspense>
  );
}
