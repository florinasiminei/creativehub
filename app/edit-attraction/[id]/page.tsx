'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import FormMessage from '@/components/forms/FormMessage';
import ListingFormSection from '@/components/forms/ListingFormSection';
import ImageUploader from '@/components/forms/ImageUploader';
import LocationPicker from '@/components/LocationPicker';
import LoadingLogo from '@/components/LoadingLogo';
import useImageSelection from '@/hooks/useImageSelection';
import useAttractionImageUploads from '@/hooks/useAttractionImageUploads';
import {
  deleteAttractionImage,
  getAttraction,
  reorderAttractionImages,
  updateAttraction,
} from '@/lib/api/attractions';
import { markPageModified } from '@/hooks/useRefreshOnNavigation';
import { validateImagesCount, validateRequired } from '@/lib/validation/listing';

type FormData = {
  title: string;
  locationName: string;
  price: string;
  description: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
  county: string;
  city: string;
};

type AttractionImage = {
  id: string;
  image_url: string;
  alt?: string | null;
};

export default function EditAttractionPage({ params }: any) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const [inviteToken, setInviteToken] = useState<string | null>(tokenParam);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error');

  const [formData, setFormData] = useState<FormData>({
    title: '',
    locationName: '',
    price: '',
    description: '',
  });
  const [images, setImages] = useState<AttractionImage[]>([]);
  const [draggingExistingIdx, setDraggingExistingIdx] = useState<number | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const [useGeolocation, setUseGeolocation] = useState(false);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  const { uploading, uploadedCount, upload } = useAttractionImageUploads({
    onError: (msg) => setMessage(msg),
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
    maxFiles: Number.POSITIVE_INFINITY,
    onLimit: (msg) => setMessage(msg),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (tokenParam) {
      setInviteToken(tokenParam);
      try {
        sessionStorage.setItem('invite_token', tokenParam);
      } catch {
        // ignore
      }
      return;
    }

    if (!inviteToken) {
      try {
        const stored = sessionStorage.getItem('invite_token');
        if (stored) setInviteToken(stored);
      } catch {
        // ignore
      }
    }
  }, [inviteToken, tokenParam]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getAttraction(String(id), inviteToken);
        if (!mounted) return;

        const attraction = data.attraction || {};
        setFormData({
          title: String(attraction.title || ''),
          locationName: String(attraction.location_name || ''),
          price:
            attraction.price === null || attraction.price === undefined || attraction.price === ''
              ? ''
              : String(attraction.price),
          description: String(attraction.description || ''),
        });

        const latValue =
          typeof attraction.lat === 'number' ? attraction.lat : attraction.lat ? Number(attraction.lat) : 0;
        const lngValue =
          typeof attraction.lng === 'number' ? attraction.lng : attraction.lng ? Number(attraction.lng) : 0;
        const hasCoords = Number.isFinite(latValue) && Number.isFinite(lngValue) && (latValue !== 0 || lngValue !== 0);
        setUseGeolocation(hasCoords);
        setIsLocationConfirmed(hasCoords);
        setLocationData(
          hasCoords
            ? {
                latitude: latValue,
                longitude: lngValue,
                county: String(attraction.judet || ''),
                city: String(attraction.city || ''),
              }
            : null
        );

        setImages(
          (data.images || []).map((img) => ({
            id: String(img.id),
            image_url: String(img.image_url),
            alt: img.alt || null,
          }))
        );
      } catch (err: any) {
        if (!mounted) return;
        setMessageTone('error');
        setMessage(err?.message || 'Nu am putut incarca atractia.');
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id, inviteToken]);

  const requiredError = validateRequired([
    { value: formData.title, label: 'Nume atractie' },
    { value: formData.locationName, label: 'Nume locatie' },
  ]);
  const imagesError = validateImagesCount(images.length + files.length, 1, 12);
  const validationError = requiredError || imagesError;

  const isInvalid = (field: keyof FormData) => showValidation && !formData[field].trim();
  const inputClass = (invalid: boolean) =>
    `mt-1 rounded-lg border px-3 py-2 focus:ring-2 bg-white text-gray-900 placeholder:text-gray-400 ${
      invalid
        ? 'border-red-400 bg-red-50 focus:ring-red-500 dark:border-red-500 dark:bg-red-950/40'
        : 'border-gray-200 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900'
    } dark:text-gray-100 dark:placeholder:text-gray-500`;

  const moveExistingImage = (from: number, to: number) => {
    setImages((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setShowValidation(true);

    if (validationError) {
      setMessageTone('error');
      setMessage(validationError);
      return;
    }

    if (useGeolocation && (!isLocationConfirmed || !locationData)) {
      setMessageTone('error');
      setMessage('Te rugam sa confirmi locatia pe harta sau debifeaza geolocatia optionala.');
      return;
    }

    const hasCoords =
      locationData !== null &&
      Number.isFinite(locationData.latitude) &&
      Number.isFinite(locationData.longitude) &&
      (locationData.latitude !== 0 || locationData.longitude !== 0);

    setLoading(true);
    try {
      let nextImages = images;
      if (files.length > 0) {
        const uploaded = await upload(String(id), files, images.length, inviteToken);
        const uploadedRows = (uploaded.uploaded || []).map((u: any) => ({
          id: String(u.id),
          image_url: String(u.url),
          alt: null,
        }));
        nextImages = [...images, ...uploadedRows];
        setImages(nextImages);
        resetFiles();
      }

      const parsedPrice = Number(formData.price);
      await updateAttraction(
        {
          id,
          title: formData.title,
          location_name: formData.locationName,
          price: formData.price.trim() ? (Number.isFinite(parsedPrice) ? parsedPrice : null) : null,
          description: formData.description.trim() || null,
          judet: hasCoords ? locationData?.county || null : null,
          city: hasCoords ? locationData?.city || null : null,
          lat: hasCoords ? Number(locationData?.latitude ?? null) : null,
          lng: hasCoords ? Number(locationData?.longitude ?? null) : null,
        },
        inviteToken
      );

      if (nextImages.length > 0) {
        await reorderAttractionImages(
          String(id),
          nextImages.map((img) => img.id),
          inviteToken
        );
      }

      markPageModified();
      setMessageTone('success');
      setMessage('Modificarile au fost salvate.');
      router.push('/drafts?updated=1');
    } catch (err: any) {
      setMessageTone('error');
      setMessage(err?.message || 'A aparut o eroare');
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
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">Administrare atractie</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold mt-2">Editeaza atractia</h1>
          <Link href="/drafts" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
            Inapoi la drafts
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <ListingFormSection step="pas 1" label="Detalii" title="Informatii principale">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`flex flex-col ${isInvalid('title') ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
              <span className="text-sm font-medium">Nume atractie *</span>
              <input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
                className={inputClass(isInvalid('title'))}
                aria-invalid={isInvalid('title')}
              />
            </label>
            <label className={`flex flex-col ${isInvalid('locationName') ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
              <span className="text-sm font-medium">Nume locatie *</span>
              <input
                value={formData.locationName}
                onChange={(e) => setFormData((prev) => ({ ...prev, locationName: e.target.value }))}
                required
                className={inputClass(isInvalid('locationName'))}
                aria-invalid={isInvalid('locationName')}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col text-gray-900 dark:text-gray-100">
              <span className="text-sm font-medium">Pret (optional)</span>
              <input
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                className={inputClass(false)}
              />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2 self-end">
              <input
                type="checkbox"
                checked={useGeolocation}
                onChange={(e) => {
                  const next = e.target.checked;
                  setUseGeolocation(next);
                  if (!next) {
                    setIsLocationConfirmed(false);
                    setLocationData(null);
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">Geolocatie (optional)</span>
            </label>
          </div>

          <label className="flex flex-col text-gray-900 dark:text-gray-100">
            <span className="text-sm font-medium">Descriere (optional)</span>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              className={inputClass(false)}
            />
          </label>
        </ListingFormSection>

        {useGeolocation && (
          <ListingFormSection step="pas 2" label="Localizare" title="Locatie pe harta (optional)">
            <LocationPicker
              onLocationSelect={(location) => setLocationData(location)}
              onConfirmChange={(confirmed) => {
                setIsLocationConfirmed(confirmed);
                if (!confirmed) setLocationData(null);
              }}
              initialCounty={locationData?.county || ''}
              initialCity={locationData?.city || ''}
              geocodeCounty={locationData?.county || ''}
              geocodeCity={locationData?.city || ''}
              initialLat={locationData?.latitude ?? null}
              initialLng={locationData?.longitude ?? null}
              autoLocate={false}
            />
          </ListingFormSection>
        )}

        <ListingFormSection step={useGeolocation ? 'pas 3' : 'pas 2'} label="Galerie" title="Poze atractie">
          <ImageUploader
            dropzoneTitle="Incarca imagini noi (minim 1, maxim 12 total)"
            dropzoneSubtitle="Accepta .jpg, .png, .webp, .avif, .heic"
            dropzoneHelper="Click sau trage imaginile aici"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/heic,image/heif,image/*"
            isActive={isDropActive}
            isInvalid={showValidation && images.length + files.length < 1}
            onActiveChange={setIsDropActive}
            onFilesSelected={appendFiles}
            files={files}
            previews={filePreviews}
            draggingIdx={draggingIdx}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onMove={moveFile}
            onRemove={removeFile}
            selectedTitle="Ordinea imaginilor noi"
            selectedSubtitle="Trage sau foloseste sagetile pentru ordinea de afisare"
            existingImages={images}
            existingTitle="Imagini existente"
            existingSubtitle="Reordoneaza sau sterge imaginile curente"
            existingDraggingIdx={draggingExistingIdx}
            onExistingDragStart={(idx) => setDraggingExistingIdx(idx)}
            onExistingDragOver={(idx) => {
              if (draggingExistingIdx === null || draggingExistingIdx === idx) return;
              moveExistingImage(draggingExistingIdx, idx);
              setDraggingExistingIdx(idx);
            }}
            onExistingDragEnd={() => setDraggingExistingIdx(null)}
            onExistingMove={moveExistingImage}
            onExistingDelete={async (img) => {
              try {
                await deleteAttractionImage(img.id, inviteToken);
                setImages((prev) => prev.filter((it) => it.id !== img.id));
              } catch (err: any) {
                setMessageTone('error');
                setMessage(err?.message || 'Nu am putut sterge imaginea.');
              }
            }}
          />
        </ListingFormSection>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="text-sm text-gray-600">
            {uploading ? `Se incarca imaginile... ${uploadedCount}/${files.length}` : 'Verifica datele si salveaza.'}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              href="/drafts"
              className="w-full sm:w-auto text-center px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Anuleaza
            </Link>
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Se salveaza...' : 'Salveaza modificari'}
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
  );
}
