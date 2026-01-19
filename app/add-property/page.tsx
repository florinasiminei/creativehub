'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

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

  useEffect(() => {
    // create object URLs for gallery preview and clean them up on change
    const next = files.map(f => URL.createObjectURL(f));
    setFilePreviews(next);
    return () => { next.forEach(url => URL.revokeObjectURL(url)); };
  }, [files]);

  const handleChange = (k: keyof SimpleForm, v: string) => setFormData(prev => ({ ...prev, [k]: v }));

  const toggleFacility = (id: string) => setSelectedFacilities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const moveFile = (from: number, to: number) => {
    setFiles(prev => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };
  const handleDragStart = (idx: number) => setDraggingIdx(idx);
  const handleDragOver = (idx: number) => {
    if (draggingIdx === null || draggingIdx === idx) return;
    moveFile(draggingIdx, idx);
    setDraggingIdx(idx);
  };
  const handleDragEnd = () => setDraggingIdx(null);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (formData.honeypot) return; // spam

    // required fields: title, judet, localitate, pret, capacitate, telefon
    if (!formData.titlu.trim() || !formData.judet.trim() || !formData.localitate.trim() || !formData.pret.trim() || !formData.capacitate.trim() || !formData.telefon.trim()) {
      setMessage('Titlu, județ, localitate, preț, capacitate și telefon sunt obligatorii.');
      return;
    }

    // client-side validations for required phone
    const phoneClean = formData.telefon.replace(/\s+/g, '');
    const phoneValid = /^\+?[0-9\-()]{6,20}$/.test(phoneClean);
    if (!phoneValid) {
      setMessage('Format telefon invalid.');
      return;
    }

    // images requirement
    if (files.length < 5) {
      setMessage('Adaugă cel puțin 5 imagini (maxim 10).');
      return;
    }
    if (files.length > 10) {
      setMessage('Poți încărca maximum 10 imagini.');
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
        // images uploaded separately
        is_published: false,
      };

      // create listing via server endpoint to avoid RLS errors
      const resp = await fetch('/api/listing-create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, facilities: selectedFacilities }) });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || 'Eroare la creare listing');
      const listingId = body.id as string;

      // facilities were already passed to the server endpoint and inserted there.

      // insert thumbnail as first image if present
        // images will be handled by server endpoint

        // upload selected files to Supabase Storage (bucket: `listing-images`) and collect URLs
        // upload files to server endpoint which will use server-side supabase Admin
        if (files.length > 0) {
          setUploading(true);
          setUploadedCount(0);
          const fd = new FormData();
          fd.append('listingId', listingId);
          files.forEach((f) => fd.append('files', f));

          const resp = await fetch('/api/listing-upload', { method: 'POST', body: fd });
          const body = await resp.json();
          if (!resp.ok) {
            console.warn('Upload endpoint error', body);
            setMessage('Eroare la upload imagini: ' + (body?.error || resp.statusText));
          } else {
            const uploaded = body.uploaded || [];
            setUploadedCount(uploaded.length);
          }
          setUploading(false);
        }
        // server endpoint already inserted listing_images

      setMessage(`Cabană creată cu id ${listingId}.`);
      try {
        router.push(`/confirm?action=created&id=${listingId}&status=draft`);
      } catch (err) {
        // ignore if router unavailable
      }
      setFormData({ titlu: '', judet: '', localitate: '', pret: '', capacitate: '2', descriere: '', telefon: '', tip: 'cabana', honeypot: '' });
      setSelectedFacilities([]);
      setFiles([]);
    } catch (err: any) {
      setMessage(err?.message || 'A apărut o eroare');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">Formular de publicare pe cabn.ro</p>
        <h1 className="text-3xl font-semibold mt-2">Adaugă o proproprietate</h1>
        <p className="text-gray-600 mt-1">Completează detaliile și atașează conținutul foto-video.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Detalii principale</p>
              <h2 className="text-lg font-semibold">Identitate și contact</h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">pas 1</span>
          </div>

          <label className="flex flex-col">
            <span className="text-sm font-medium">Titlu *</span>
            <input value={formData.titlu} onChange={e => handleChange('titlu', e.target.value)} required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium">Județ *</span>
              <input value={formData.judet} onChange={e => handleChange('judet', e.target.value)} required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="flex flex-col">
              <span className="text-sm font-medium">Localitate *</span>
              <input value={formData.localitate} onChange={e => handleChange('localitate', e.target.value)} required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium">Preț (lei/noapte)</span>
              <input value={formData.pret} onChange={e => handleChange('pret', e.target.value)} type="number" required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="flex flex-col">
              <span className="text-sm font-medium">Capacitate (pers.)</span>
              <input value={formData.capacitate} onChange={e => handleChange('capacitate', e.target.value)} type="number" required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
            </label>
          </div>

          <label className="flex flex-col">
            <span className="text-sm font-medium">Telefon</span>
            <input value={formData.telefon} onChange={e => handleChange('telefon', e.target.value)} required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium">Tip</span>
            <select value={formData.tip} onChange={e => handleChange('tip', e.target.value)} className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500">
              <option value="cabana">Cabană</option>
              <option value="apartment">Apartament</option>
              <option value="vila">Vilă</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium">Descriere</span>
            <textarea value={formData.descriere} onChange={e => handleChange('descriere', e.target.value)} className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" rows={4} />
          </label>

          <div>
            <div className="text-sm font-medium mb-2">Facilități (opțional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {facilitiesList.map(f => (
                <label key={f.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:border-emerald-400 transition">
                  <input type="checkbox" checked={selectedFacilities.includes(f.id)} onChange={() => toggleFacility(f.id)} className="h-4 w-4" />
                  <span className="text-sm">{f.name}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Galerie</p>
              <h2 className="text-lg font-semibold">Ordine imagini</h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">pas 2</span>
          </div>

          <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center cursor-pointer hover:border-emerald-400 transition">
            <div className="text-sm font-medium text-emerald-800">Încarcă imagini (minim 5, maxim 10)</div>
            <div className="text-xs text-gray-600">Acceptă .jpg, .png, .webp, .avif, .heic</div>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/heic,image/heif,image/*"
              multiple
              className="hidden"
              onChange={e => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                if (list.length === 0) return;
                setFiles(prev => {
                  const next = [...prev, ...list];
                  if (next.length > 10) {
                    setMessage('Poți încărca maximum 10 imagini.');
                    return next.slice(0, 10);
                  }
                  return next;
                });
              }}
            />
            <span className="text-xs text-gray-500">Click pentru a selecta</span>
          </label>

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Galerie imaginilor adăugate</div>
                <div className="text-xs text-gray-500">Folosește săgețile pentru a reordona (5-10 imagini)</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className={`rounded-xl overflow-hidden border bg-white shadow-sm ${draggingIdx === idx ? 'ring-2 ring-emerald-500' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => { e.preventDefault(); handleDragOver(idx); }}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="relative h-48 bg-gray-50 touch-pan-y">
                      {filePreviews[idx] && <img src={filePreviews[idx]} alt={`Imagine ${idx + 1}`} className="h-full w-full object-cover" />}
                      <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded-full bg-white/80 text-gray-700 shadow">#{idx + 1}</div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 border-t bg-white">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moveFile(idx, idx - 1)} disabled={idx === 0} className="h-8 w-8 rounded-full border text-xs font-semibold disabled:opacity-40">↑</button>
                        <button type="button" onClick={() => moveFile(idx, idx + 1)} disabled={idx === files.length - 1} className="h-8 w-8 rounded-full border text-xs font-semibold disabled:opacity-40">↓</button>
                        <button type="button" onClick={() => removeFile(idx)} className="h-8 w-8 rounded-full border text-xs font-semibold text-red-600">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* honeypot */}
        <input type="text" value={formData.honeypot} onChange={e => handleChange('honeypot', e.target.value)} className="hidden" aria-hidden />

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-gray-600">
            {uploading ? `Se încarcă imaginile... ${uploadedCount}/${files.length}` : 'Verifică datele și folosește butonul de creare.'}
          </div>
          <button type="submit" disabled={loading || uploading} className="bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow hover:bg-emerald-700 disabled:opacity-60">
            {loading ? 'Se salvează...' : 'Creează cabană'}
          </button>
        </div>

        {message && <div className="text-sm text-gray-700">{message}</div>}
      </form>
    </div>
  );
}
