'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ListingForm from '@/components/forms/ListingForm';
import useImageSelection from '@/hooks/useImageSelection';
import useImageUploads from '@/hooks/useImageUploads';
import useListingForm from '@/hooks/useListingForm';
import { createListing } from '@/lib/api/listings';

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

export default function AddPropertyPage() {
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
  const router = useRouter();
  const { uploading, uploadedCount, upload } = useImageUploads({
    onError: (msg) => setMessage(msg),
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
    return () => { mounted = false; };
  }, []);

  const handleChange = (k: keyof SimpleForm, v: string) => setFormData(prev => ({ ...prev, [k]: v }));

  const toggleFacility = (id: string) => setSelectedFacilities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const { error: validationError } = useListingForm({
    requiredFields: [
      { value: formData.titlu, label: 'Titlu' },
      { value: formData.judet, label: 'Județ' },
      { value: formData.localitate, label: 'Localitate' },
      { value: formData.pret, label: 'Preț' },
      { value: formData.capacitate, label: 'Capacitate' },
      { value: formData.telefon, label: 'Telefon' },
    ],
    phone: formData.telefon,
    imagesCount: files.length,
    minImages: 5,
    maxImages: 10,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (formData.honeypot) return; // spam
    if (validationError) {
      setMessage(validationError);
      return;
    }

    // no external image URLs or thumbnail

    setLoading(true);
    try {
      const payload = {
        title: formData.titlu,
        slug: formData.titlu.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        // store county in `location` and city/village in `address`
        location: formData.judet,
        address: formData.localitate || null,
        price: Number(formData.pret) || 0,
        capacity: Number(formData.capacitate) || 1,
        phone: formData.telefon || null,
        type: formData.tip,
        description: formData.descriere || null,
        // Location data from Google Maps
        latitude: locationData?.latitude || null,
        longitude: locationData?.longitude || null,
        search_radius: locationData?.radius || 1,
        // images uploaded separately
        is_published: false,
      };
      // create listing via server endpoint to avoid RLS errors
      const { id: listingId } = await createListing(payload, selectedFacilities);

      // facilities were already passed to the server endpoint and inserted there.

      // insert thumbnail as first image if present
        // images will be handled by server endpoint

        // upload selected files to Supabase Storage (bucket: `listing-images`) and collect URLs
        // upload files to server endpoint which will use server-side supabase Admin
        if (files.length > 0) {
          await upload(listingId, files, 0);
        }
        // server endpoint already inserted listing_images

      setMessage(`Anunț creat cu id ${listingId}.`);
      try {
        router.push(`/confirm?action=created&id=${listingId}&status=draft`);
      } catch (err) {
        // ignore if router unavailable
      }
      setFormData({ titlu: '', judet: '', localitate: '', pret: '', capacitate: '2', descriere: '', telefon: '', tip: 'cabana', honeypot: '' });
      setSelectedFacilities([]);
      resetFiles();
    } catch (err: any) {
      setMessage(err?.message || 'A apărut o eroare');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">Formular de publicare pe cabn.ro</p>
        <h1 className="text-3xl font-semibold mt-2">Adaugă o proprietate</h1>
        <p className="text-gray-600 mt-1">Completează detaliile și atașează conținutul foto-video.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
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
          dropzoneTitle="Încarcă imagini (minim 5, maxim 10)"
          dropzoneSubtitle="Acceptă .jpg, .png, .webp, .avif, .heic"
          dropzoneHelper="Click pentru a selecta"
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
          selectedImagesTitle="Galerie imaginilor adaugate"
          selectedImagesSubtitle="Foloseste sagetile pentru a reordona (5-10 imagini)"
        />

        {/* honeypot */}
        <input type="text" value={formData.honeypot} onChange={e => handleChange('honeypot', e.target.value)} className="hidden" aria-hidden />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="text-sm text-gray-600">
            {uploading ? `Se încarcă imaginile... ${uploadedCount}/${files.length}` : 'Verifică datele și folosește butonul de creare.'}
          </div>
          <button type="submit" disabled={loading || uploading} className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow hover:bg-emerald-700 disabled:opacity-60">
            {loading ? 'Se salvează...' : 'Creează cabană'}
          </button>
        </div>

        {message && <div className="text-sm text-gray-700" role="status" aria-live="polite">{message}</div>}
      </form>
    </div>
  );
}
