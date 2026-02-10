'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ListingForm from '@/components/forms/ListingForm';
import LoadingLogo from '@/components/LoadingLogo';
import FormMessage from '@/components/forms/FormMessage';
import useImageSelection from '@/hooks/useImageSelection';
import useImageUploads from '@/hooks/useImageUploads';
import useListingForm from '@/hooks/useListingForm';
import { markPageModified } from '@/hooks/useRefreshOnNavigation';
import { createListing, deleteListing } from '@/lib/api/listings';
import { sortFacilitiesByPriority } from '@/lib/facilitiesCatalog';
import { slugify } from '@/lib/utils';

type FacilityOption = { id: string; name: string };

type SimpleForm = {
  titlu: string;
  judet: string;
  localitate: string;
  sat: string;
  pret: string; // keep as string for easy input
  capacitate: string;
  camere: string;
  paturi: string;
  bai: string;
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
};

export default function AddPropertyPageContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');
  const isClient = searchParams.get('client') === '1' || searchParams.get('role') === 'client';
  const [inviteToken, setInviteToken] = useState<string | null>(tokenParam);
  const [tokenReady, setTokenReady] = useState(false);
  const [formData, setFormData] = useState<SimpleForm>({
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
    // no thumbnail/image_urls
    honeypot: '',
  });

  const [facilitiesList, setFacilitiesList] = useState<FacilityOption[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failedUploads, setFailedUploads] = useState<Array<{ name: string; reason: string }>>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(!isClient);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
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
    maxFiles: Number.POSITIVE_INFINITY,
    onLimit: (msg) => setMessage(msg),
  });

  useEffect(() => {
    let mounted = true;
    async function fetchFacilities() {
      try {
        const { data } = await supabase.from('facilities').select('id, name');
        if (mounted && data) setFacilitiesList(sortFacilitiesByPriority(data as FacilityOption[]));
      } catch (e) {
        // ignore
      }
    }
    fetchFacilities();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (tokenParam) {
      setInviteToken(tokenParam);
      try {
        sessionStorage.setItem('invite_token', tokenParam);
      } catch {
        // ignore storage issues
      }
      if (!isClient) {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete('token');
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `/add-property?${nextQuery}` : '/add-property');
      }
      setTokenReady(true);
      return;
    }

    if (!inviteToken) {
      try {
        const stored = sessionStorage.getItem('invite_token');
        if (stored) setInviteToken(stored);
      } catch {
        // ignore storage issues
      }
    }
    setTokenReady(true);
  }, [tokenParam, searchParams, router, inviteToken, isClient]);

  useEffect(() => {
    setAcceptedTerms(!isClient);
  }, [isClient]);

  const handleChange = (k: keyof SimpleForm, v: string) => setFormData(prev => ({ ...prev, [k]: v }));
  const handleLocationSelect = (location: LocationData) => {
    setLocationData(location);
  };

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
    capacity: formData.capacitate,
    phone: formData.telefon,
    phoneKey: 'telefon',
    imagesCount: files.length,
    minImages: isClient ? 5 : 0,
    maxImages: 12,
    description: formData.descriere,
    descriptionKey: 'descriere',
    descriptionMin: 200,
    descriptionMax: 520,
    enforceDescription: isClient,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFailedUploads([]);
    setShowValidation(true);
    if (formData.honeypot) return; // spam
    if (validationError) {
      setMessage(validationError);
      setValidationAttempt((prev) => prev + 1);
      return;
    }
    if (isClient && !acceptedTerms) {
      setMessage('Te rugam sa accepti termenii si conditiile.');
      return;
    }
    if (!isLocationConfirmed || !locationData) {
      setMessage('Te rugam sa confirmi locatia.');
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
      const baseSlug = slugify(formData.titlu || '') || 'cazare';
      const judet = locationData?.county || formData.judet;
      const city = locationData?.city || formData.localitate || null;
      const payload = {
        title: formData.titlu,
        slug: baseSlug,
        judet,
        city,
        sat: formData.sat || null,
        price: Number(formData.pret) || 0,
        capacity: formData.capacitate || '1',
        camere: Number(formData.camere) || 0,
        paturi: Number(formData.paturi) || 0,
        bai: Number(formData.bai) || 0,
        phone: formData.telefon || null,
        type: formData.tip,
        description: formData.descriere || null,
        // Location data from Google Maps
        lat: hasCoords ? Number(locationData?.latitude ?? null) : null,
        lng: hasCoords ? Number(locationData?.longitude ?? null) : null,
        // images uploaded separately
        is_published: false,
      };
      if (isClient) {
        (payload as any).newsletter_opt_in = newsletterOptIn;
      }
      // create listing via server endpoint to avoid RLS errors
      const created = await createListing(payload, selectedFacilities, inviteToken);
      const listingId = created.id;
      const listingToken = created.editToken || null;

      // upload selected files to server endpoint which will use server-side supabase Admin
      if (files.length > 0) {
        try {
          await upload(listingId, files, 0, listingToken);
        } catch (err: any) {
          try {
            await deleteListing(listingId, inviteToken);
          } catch {
            // ignore rollback errors
          }
          const failed = Array.isArray(err?.failed) ? err.failed : [];
          setFailedUploads(failed);
      setMessage(
            err?.message ||
              (failed.length > 0
                ? 'Nu s-au incarcat toate imaginile.'
                : 'Eroare la incarcarea imaginilor')
          );
          return;
        }
      }

      try {
        markPageModified();
        if (isClient) {
          router.push(`/?submitted=1`);
        } else {
          router.push(`/drafts?created=1&id=${listingId}`);
        }
      } catch (err) {
        // ignore if router unavailable
      }
      setFormData({
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
        honeypot: '',
      });
      setSelectedFacilities([]);
      resetFiles();
    } catch (err: any) {
      setMessage(err.message || 'A aparut o eroare');
    } finally {
      setLoading(false);
    }
  };

  if (!inviteToken) {
    if (!tokenReady) {
      return (
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 min-h-[60vh]">
          <h1 className="text-2xl font-semibold mb-2">Se incarca...</h1>
          <p className="text-gray-600">Verificam accesul.</p>
        </div>
      );
    }
    return (
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 min-h-[60vh]">
        <h1 className="text-2xl font-semibold mb-2">Acces restrictionat</h1>
        <p className="text-gray-600">Ai nevoie de un link valid pentru a adauga o proprietate.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      {(loading || uploading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-black/70 backdrop-blur-sm">
          <LoadingLogo />
        </div>
      )}
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">Formular de publicare pe cabn.ro</p>
        <h1 className="text-3xl font-semibold mt-2">Adauga o proprietate</h1>
        <p className="text-gray-600 mt-1">Completeaza detaliile si ataseaza continutul foto-video.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <p className="text-sm text-gray-600">Toate campurile sunt obligatorii, cu exceptia celor marcate (optional).</p>
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
          dropzoneTitle="Incarca imagini (minim 5, maxim 12)"
          dropzoneSubtitle="Accepta .jpg, .png, .webp, .avif, .heic"
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
          draggingIdx={draggingIdx}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onMove={moveFile}
          onRemove={removeFile}
          selectedImagesTitle="Ordinea galeriei foto"
          selectedImagesSubtitle="Trage sau foloseste sagetile pentru ordinea de afisare (5-12 imagini)"
          selectedFailedNames={failedUploads.map((f) => f.name)}
          descriptionMin={200}
          descriptionMax={520}
          descriptionRequired={isClient}
        />

        {/* honeypot */}
        <input type="text" value={formData.honeypot} onChange={e => handleChange('honeypot', e.target.value)} className="hidden" aria-hidden />

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
            {uploading
              ? `Se incarca imaginile... ${uploadedCount}/${files.length}`
              : 'Verifica datele si foloseste butonul de creare.'}
          </div>
          <button type="submit" disabled={loading || uploading} className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow hover:bg-emerald-700 disabled:opacity-60">
            {loading ? 'Se salveaza...' : 'Adauga proprietate'}
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
