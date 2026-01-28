"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import ListingForm from '@/components/forms/ListingForm';
import useImageSelection from '@/hooks/useImageSelection';
import useImageUploads from '@/hooks/useImageUploads';
import useListingForm from '@/hooks/useListingForm';
import { deleteListingImage, reorderListingImages, updateListing } from '@/lib/api/listings';

type FacilityOption = { id: string; name: string };
type ListingImage = { id: string; image_url: string; alt?: string | null };

type FormData = {
  titlu: string;
  judet: string;
  localitate: string;
  pret: string;
  capacitate: string;
  descriere: string;
  telefon: string;
  tip: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
  county: string;
  city: string;
  radius: number;
};

export default function EditPropertyPage({ params }: any) {
  const { id } = params;
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    titlu: '',
    judet: '',
    localitate: '',
    pret: '',
    capacitate: '2',
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
  const { uploading, upload } = useImageUploads({
    onError: (msg) => setMessage(msg),
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
          setFormData({
            titlu: listing.title || '',
            judet: listing.location || '',
            localitate: listing.address || '',
            pret: listing.price?.toString() || '',
            capacitate: (listing.capacity || 1).toString(),
            descriere: listing.description || '',
            telefon: listing.phone || '',
            tip: listing.type || 'cabana',
          });
          setLocationData({
            latitude: listing.latitude || 0,
            longitude: listing.longitude || 0,
            county: listing.location || '',
            city: listing.address || '',
            radius: listing.search_radius || 1,
          });
        }

        if (facilities) setFacilitiesList(facilities as FacilityOption[]);
        if (selected) setSelectedFacilities(Array.isArray(selected) ? selected : (selected || []));
        if (imgs) setImages(imgs as ListingImage[]);
      } catch (err) {
        console.error('Load error:', err);
      }
    }

    load();
    return () => { mounted = false; };
  }, [id]);

  const handleChange = (k: keyof FormData, v: string) => {
    setFormData(prev => ({ ...prev, [k]: v }));
  };

  const toggleFacility = (idf: string) => {
    setSelectedFacilities(prev => prev.includes(idf) ? prev.filter(x => x !== idf) : [...prev, idf]);
  };

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
    imagesCount: images.length + files.length,
    minImages: 5,
    maxImages: 10,
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
    if (validationError) {
      setMessage(validationError);
      return;
    }

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
        address: locationData?.city || formData.localitate,
        price: Number(formData.pret) || 0,
        capacity: Number(formData.capacitate) || 1,
        phone: formData.telefon,
        description: formData.descriere,
        type: formData.tip,
        facilities: selectedFacilities,
        latitude: locationData?.latitude || null,
        longitude: locationData?.longitude || null,
        search_radius: locationData?.radius || 1,
      };
      await updateListing(updatePayload);

      // Persist image order
      if (updatedImages.length > 0) {
        const idsInOrder = updatedImages.map(img => img.id);
        await reorderListingImages(id, idsInOrder);
      }

      setMessage('Modificările au fost salvate.');
      router.push(`/confirm?action=updated&id=${id}&status=draft`);
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
          <Link href="/drafts" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
            Înapoi la listări
          </Link>
        </div>
        <p className="text-gray-600 mt-1">Actualizează detaliile și gestionează ordinea galeriilor înainte de publicare.</p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-8">
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
          dropzoneTitle="Încarcă imagini noi (minim 5, maxim 10 total)"
          dropzoneSubtitle="Selectează fișiere și ordonează-le înainte de publicare"
          dropzoneHelper="Click pentru a selecta"
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
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="text-sm text-gray-600">
            {uploading ? `Se încarcă imaginile... ${(images.length + files.length)}/${files.length}` : 'Verifică datele și salvează modificările.'}
          </div>
          <button type="submit" disabled={loading || uploading} className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow hover:bg-emerald-700 disabled:opacity-60">
            {loading ? 'Se salvează...' : 'Salvează modificări'}
          </button>
        </div>

        {message && <div className="text-sm text-gray-700" role="status" aria-live="polite">{message}</div>}
      </form>
    </div>
  )
}
