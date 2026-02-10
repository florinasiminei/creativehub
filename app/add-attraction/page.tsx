'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FormMessage from '@/components/forms/FormMessage';
import ListingFormSection from '@/components/forms/ListingFormSection';
import ImageUploader from '@/components/forms/ImageUploader';
import LocationPicker from '@/components/LocationPicker';
import useImageSelection from '@/hooks/useImageSelection';
import useAttractionImageUploads from '@/hooks/useAttractionImageUploads';
import { createAttraction, deleteAttraction } from '@/lib/api/attractions';
import { markPageModified } from '@/hooks/useRefreshOnNavigation';
import { validateImagesCount, validateRequired } from '@/lib/validation/listing';

type SimpleForm = {
  title: string;
  locationName: string;
  price: string;
  description: string;
  honeypot: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
  county: string;
  city: string;
};

function AddAttractionPageContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const [inviteToken, setInviteToken] = useState<string | null>(tokenParam);
  const [tokenReady, setTokenReady] = useState(false);
  const [formData, setFormData] = useState<SimpleForm>({
    title: '',
    locationName: '',
    price: '',
    description: '',
    honeypot: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failedUploads, setFailedUploads] = useState<Array<{ name: string; reason: string }>>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [useGeolocation, setUseGeolocation] = useState(false);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  const router = useRouter();

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
    maxFiles: 12,
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
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete('token');
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `/add-attraction?${nextQuery}` : '/add-attraction');
      setTokenReady(true);
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
    setTokenReady(true);
  }, [tokenParam, searchParams, router, inviteToken]);

  const handleChange = (key: keyof SimpleForm, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const requiredError = validateRequired([
    { value: formData.title, label: 'Nume atractie' },
    { value: formData.locationName, label: 'Nume locatie' },
  ]);
  const imagesError = validateImagesCount(files.length, 1, 12);
  const validationError = requiredError || imagesError;

  const isInvalid = (key: keyof SimpleForm) => showValidation && !formData[key].trim();
  const inputClass = (invalid: boolean) =>
    `mt-1 rounded-lg border px-3 py-2 focus:ring-2 bg-white text-gray-900 placeholder:text-gray-400 ${
      invalid
        ? 'border-red-400 bg-red-50 focus:ring-red-500 dark:border-red-500 dark:bg-red-950/40'
        : 'border-gray-200 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900'
    } dark:text-gray-100 dark:placeholder:text-gray-500`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFailedUploads([]);
    setShowValidation(true);

    if (formData.honeypot) return;

    if (validationError) {
      setMessage(validationError);
      return;
    }

    if (useGeolocation && (!isLocationConfirmed || !locationData)) {
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
      const parsedPrice = Number(formData.price);
      const payload = {
        title: formData.title,
        location_name: formData.locationName,
        price: formData.price.trim() ? (Number.isFinite(parsedPrice) ? parsedPrice : null) : null,
        description: formData.description.trim() || null,
        judet: hasCoords ? locationData?.county || null : null,
        city: hasCoords ? locationData?.city || null : null,
        lat: hasCoords ? Number(locationData?.latitude ?? null) : null,
        lng: hasCoords ? Number(locationData?.longitude ?? null) : null,
      };

      const created = await createAttraction(payload, inviteToken);
      const attractionId = created.id;

      try {
        await upload(attractionId, files, 0, inviteToken);
      } catch (err: any) {
        try {
          await deleteAttraction(attractionId, inviteToken);
        } catch {
          // ignore rollback errors
        }
        const failed = Array.isArray(err?.failed) ? err.failed : [];
        setFailedUploads(failed);
        setMessage(
          err?.message ||
            (failed.length > 0 ? 'Nu s-au incarcat toate imaginile.' : 'Eroare la incarcarea imaginilor')
        );
        return;
      }

      markPageModified();
      router.push('/drafts');

      setFormData({
        title: '',
        locationName: '',
        price: '',
        description: '',
        honeypot: '',
      });
      setUseGeolocation(false);
      setIsLocationConfirmed(false);
      setLocationData(null);
      resetFiles();
    } catch (err: any) {
      const raw = String(err?.message || '');
      if (/unauthorized/i.test(raw)) {
        setMessage('Nu ai acces pentru a adauga atractii. Intra din pagina Drafts cu cont de staff/admin.');
      } else {
        setMessage(raw || 'A aparut o eroare');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!tokenReady) {
    return (
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 min-h-[60vh]">
        <h1 className="text-2xl font-semibold mb-2">Se incarca...</h1>
        <p className="text-gray-600">Verificam accesul.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">Formular de publicare pe cabn.ro</p>
        <h1 className="text-3xl font-semibold mt-2">Adauga o atractie</h1>
        <p className="text-gray-600 mt-1">Completeaza detaliile de baza si incarca imagini.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <p className="text-sm text-gray-600">Campurile cu * sunt obligatorii.</p>

        <ListingFormSection step="pas 1" label="Detalii" title="Informatii principale">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`flex flex-col ${isInvalid('title') ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
              <span className="text-sm font-medium">Nume atractie *</span>
              <input
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                maxLength={120}
                required
                className={inputClass(isInvalid('title'))}
                aria-invalid={isInvalid('title')}
              />
            </label>

            <label className={`flex flex-col ${isInvalid('locationName') ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
              <span className="text-sm font-medium">Nume locatie *</span>
              <input
                value={formData.locationName}
                onChange={(e) => handleChange('locationName', e.target.value)}
                maxLength={120}
                required
                placeholder="Ex: Cascada Cailor, Lacul Rosu"
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
                onChange={(e) => handleChange('price', e.target.value)}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="Ex: 25"
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
              <span className="text-sm text-gray-700 dark:text-gray-200">Adauga geolocatie (optional)</span>
            </label>
          </div>

          <label className="flex flex-col text-gray-900 dark:text-gray-100">
            <span className="text-sm font-medium">Descriere (optional)</span>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              maxLength={1200}
              className={inputClass(false)}
              placeholder="Detalii utile pentru vizitatori"
            />
          </label>
        </ListingFormSection>

        {useGeolocation && (
          <ListingFormSection step="pas 2" label="Localizare" title="Locatie pe harta (optional)">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Daca vrei, poti adauga pin-ul exact pe harta pentru folosire viitoare in "atractii in apropiere".
            </p>
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
            />
          </ListingFormSection>
        )}

        <ListingFormSection step={useGeolocation ? 'pas 3' : 'pas 2'} label="Galerie" title="Poze atractie">
          <ImageUploader
            dropzoneTitle="Incarca imagini (minim 1, maxim 12)"
            dropzoneSubtitle="Accepta .jpg, .png, .webp, .avif, .heic"
            dropzoneHelper="Click sau trage imaginile aici"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/heic,image/heif,image/*"
            isActive={isDropActive}
            isInvalid={showValidation && files.length < 1}
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
            selectedTitle="Ordinea galeriei"
            selectedSubtitle="Trage sau foloseste sagetile pentru ordinea de afisare"
            selectedFailedNames={failedUploads.map((f) => f.name)}
          />
        </ListingFormSection>

        <input
          type="text"
          value={formData.honeypot}
          onChange={(e) => handleChange('honeypot', e.target.value)}
          className="hidden"
          aria-hidden
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="text-sm text-gray-600">
            {uploading
              ? `Se incarca imaginile... ${uploadedCount}/${files.length}`
              : 'Verifica datele si foloseste butonul de creare.'}
          </div>
          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Se salveaza...' : 'Adauga atractie'}
          </button>
        </div>

        {message && (
          <FormMessage variant="error" role="status" aria-live="polite">
            <div className="font-semibold">{message}</div>
            {failedUploads.length > 0 && (
              <ul className="mt-2 space-y-1">
                {failedUploads.map((f, idx) => (
                  <li key={`${f.name}-${idx}`} className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span>
                      <span className="font-medium">{f.name}</span>
                      {f.reason ? ` - ${f.reason === 'file_too_large' ? 'fisier prea mare' : f.reason}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </FormMessage>
        )}
      </form>
    </div>
  );
}

export default function AddAttractionPage() {
  return (
    <>
      <section className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <h1 className="text-3xl font-semibold text-emerald-950">Adauga o atractie pe cabn.ro</h1>
        <p className="mt-3 text-gray-700 max-w-3xl">
          Formular pentru adaugare rapida de atractii locale care pot fi asociate ulterior cu cazarile.
        </p>
      </section>
      <Suspense
        fallback={
          <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 min-h-[60vh]">
            <h2 className="text-2xl font-semibold mb-2">Se incarca...</h2>
            <p className="text-gray-600">Pregatim formularul de atractii.</p>
          </div>
        }
      >
        <AddAttractionPageContent />
      </Suspense>
    </>
  );
}
