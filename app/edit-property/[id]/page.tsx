"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';

type FacilityOption = { id: string; name: string };
type ListingImage = { id: string; image_url: string; alt?: string | null };

export default function EditPropertyPage({ params }: any) {
  const { id } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({ titlu: '', judet: '', localitate: '', pret: '', capacitate: '2', descriere: '', telefon: '', tip: 'cabana' });
  const [facilitiesList, setFacilitiesList] = useState<FacilityOption[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [draggingNewIdx, setDraggingNewIdx] = useState<number | null>(null);
  const [draggingExistingIdx, setDraggingExistingIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      // fetch listing via server endpoint (admin) to bypass RLS
      const resp = await fetch('/api/listing-get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const { listing, images: imgs, facilities: selected } = await resp.json();
      const { data: facilities } = await supabase.from('facilities').select('id, name');

      if (!mounted) return;
      if (listing) setFormData({ titlu: listing.title || '', judet: listing.location || '', localitate: listing.address || '', pret: listing.price?.toString() || '', capacitate: (listing.capacity || 1).toString(), descriere: listing.description || '', telefon: listing.phone || '', tip: listing.type || 'cabana' });
      if (facilities) setFacilitiesList(facilities as FacilityOption[]);
      if (selected) setSelectedFacilities(Array.isArray(selected) ? selected : (selected || []));
      if (imgs) setImages(imgs as ListingImage[]);
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    const next = files.map(f => URL.createObjectURL(f));
    setFilePreviews(next);
    return () => { next.forEach(url => URL.revokeObjectURL(url)); };
  }, [files]);

  const handleChange = (k: string, v: string) => setFormData((p: any) => ({ ...p, [k]: v }));
  const toggleFacility = (idf: string) => setSelectedFacilities(prev => prev.includes(idf) ? prev.filter(x => x !== idf) : [...prev, idf]);

  const moveFile = (from: number, to: number) => {
    setFiles(prev => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const moveImage = (from: number, to: number) => {
    setImages(prev => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleNewDragStart = (idx: number) => setDraggingNewIdx(idx);
  const handleNewDragOver = (idx: number) => {
    if (draggingNewIdx === null || draggingNewIdx === idx) return;
    moveFile(draggingNewIdx, idx);
    setDraggingNewIdx(idx);
  };
  const handleNewDragEnd = () => setDraggingNewIdx(null);

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
    setLoading(true);
    try {
      // call secure server endpoint that uses service role key
      // client-side validation
      if (!formData.titlu.trim() || !formData.judet.trim() || !formData.localitate.trim() || !formData.pret.trim() || !formData.capacitate.trim() || !formData.telefon.trim()) {
        alert('Titlu, județ, localitate, preț, capacitate și telefon sunt obligatorii.');
        setLoading(false);
        return;
      }

      const totalPlanned = images.length + files.length;
      if (totalPlanned > 10) {
        setMessage('Poți avea maximum 10 imagini la o cazare (existente + noi).');
        setLoading(false);
        return;
      }
      if (totalPlanned < 5) {
        setMessage('Adaugă cel puțin 5 imagini înainte de a salva.');
        setLoading(false);
        return;
      }

      // upload new images, preserving order
      let updatedImages = images;
      if (files.length > 0) {
        setUploading(true);
        const fd = new FormData();
        fd.append('listingId', id);
        fd.append('startIndex', String(images.length));
        files.forEach(f => fd.append('files', f));
        const respUpload = await fetch('/api/listing-upload', { method: 'POST', body: fd });
        const uploadBody = await respUpload.json();
        if (!respUpload.ok) throw new Error(uploadBody?.error || 'Eroare la încărcarea imaginilor');
        const uploaded = (uploadBody?.uploaded || []) as Array<{ id: string; url: string; display_order: number }>;
        if (uploaded.length > 0) {
          updatedImages = [...images, ...uploaded.map(u => ({ id: u.id, image_url: u.url, alt: null }))];
          setImages(updatedImages);
        }
        setFiles([]);
        setFilePreviews([]);
        setUploading(false);
      }

      const resp = await fetch('/api/listing-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, title: formData.titlu, location: formData.judet, address: formData.localitate, price: Number(formData.pret) || 0, capacity: Number(formData.capacitate)||1, phone: formData.telefon, description: formData.descriere, type: formData.tip, facilities: selectedFacilities }) });
      const b = await resp.json();
      if (!resp.ok) throw new Error(b?.error || 'Eroare la update');
      // persist image order
      if (updatedImages.length > 0) {
        const idsInOrder = updatedImages.map(img => img.id);
        await fetch('/api/listing-images/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId: id, ids: idsInOrder }) });
      }
      setMessage('Modificările au fost salvate.');
      router.push(`/confirm?action=updated&id=${id}&status=draft`);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : 'A apărut o eroare');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">Administrare listare</p>
        <h1 className="text-3xl font-semibold mt-2">Editează cabana</h1>
        <p className="text-gray-600 mt-1">Actualizează detaliile și gestionează ordinea galeriilor înainte de publicare.</p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        <section className="rounded-2xl border bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Detalii principale</p>
              <h2 className="text-lg font-semibold">Identitate și contact</h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">pas 1</span>
          </div>

          <label className="flex flex-col"><span className="text-sm font-medium">Titlu</span><input value={formData.titlu} onChange={e => handleChange('titlu', e.target.value)} required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" /></label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col"><span className="text-sm font-medium">Județ</span><input value={formData.judet} onChange={e => handleChange('judet', e.target.value)} required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" /></label>
            <label className="flex flex-col"><span className="text-sm font-medium">Localitate</span><input value={formData.localitate} onChange={e => handleChange('localitate', e.target.value)} required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" /></label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col"><span className="text-sm font-medium">Preț</span><input value={formData.pret} onChange={e => handleChange('pret', e.target.value)} type="number" required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" /></label>
            <label className="flex flex-col"><span className="text-sm font-medium">Capacitate</span><input value={formData.capacitate} onChange={e => handleChange('capacitate', e.target.value)} type="number" required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" /></label>
          </div>
          <label className="flex flex-col"><span className="text-sm font-medium">Telefon</span><input value={formData.telefon} onChange={e => handleChange('telefon', e.target.value)} required className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" /></label>
          <label className="flex flex-col"><span className="text-sm font-medium">Descriere</span><textarea value={formData.descriere} onChange={e => handleChange('descriere', e.target.value)} className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500" rows={4} /></label>

          <div>
            <div className="text-sm font-medium mb-2">Facilități</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {facilitiesList.map(f => (
                <label key={f.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 hover:border-emerald-400 transition"><input type="checkbox" checked={selectedFacilities.includes(f.id)} onChange={() => toggleFacility(f.id)} className="h-4 w-4" /><span className="text-sm">{f.name}</span></label>
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
            <div className="text-sm font-medium text-emerald-800">Încarcă imagini noi (minim 5, maxim 10 total)</div>
            <div className="text-xs text-gray-600">Selectează fișiere și ordonează-le înainte de publicare</div>
            <input type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/heic,image/heif,image/*" className="hidden" onChange={e => {
              const list = e.target.files ? Array.from(e.target.files) : [];
              setFiles(prev => {
                const total = images.length + prev.length + list.length;
                if (total > 10) {
                  setMessage('Poți avea maximum 10 imagini (existente + noi).');
                  const allowed = Math.max(0, 10 - images.length - prev.length);
                  return allowed > 0 ? [...prev, ...list.slice(0, allowed)] : prev;
                }
                return [...prev, ...list];
              });
            }} />
            <span className="text-xs text-gray-500">Click pentru a selecta</span>
          </label>

          {images.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Galerie existentă</div>
                <div className="text-xs text-gray-500">Reordonează sau șterge imaginile curente</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className={`rounded-xl overflow-hidden border bg-white shadow-sm ${draggingExistingIdx === idx ? 'ring-2 ring-emerald-500' : ''}`}
                    draggable
                    onDragStart={() => handleExistingDragStart(idx)}
                    onDragOver={(e) => { e.preventDefault(); handleExistingDragOver(idx); }}
                    onDragEnd={handleExistingDragEnd}
                  >
                    <div className="relative h-48 bg-gray-50">
                      <img src={img.image_url} alt={img.alt || 'Imagine listare'} className="h-full w-full object-cover" />
                      <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded-full bg-white/80 text-gray-700 shadow">#{idx + 1}</div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 border-t bg-white">
                      <div className="text-sm font-medium truncate">#{idx + 1}</div>
                      <div className="flex items-center gap-1 ml-auto">
                        <button type="button" onClick={() => moveImage(idx, idx - 1)} disabled={idx === 0} className="h-8 w-8 rounded-full border text-xs font-semibold disabled:opacity-40">↑</button>
                        <button type="button" onClick={() => moveImage(idx, idx + 1)} disabled={idx === images.length - 1} className="h-8 w-8 rounded-full border text-xs font-semibold disabled:opacity-40">↓</button>
                        <button type="button" onClick={async () => {
                          const res = await fetch('/api/listing-images/delete', { method: 'POST', body: JSON.stringify({ id: img.id }), headers: { 'Content-Type': 'application/json' } });
                          if (res.ok) setImages(prev => prev.filter(it => it.id !== img.id));
                        }} className="h-8 w-8 rounded-full border text-xs font-semibold text-red-600">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Imagini noi (nepublicate încă)</div>
                <div className="text-xs text-gray-500">Ordinea de mai jos va fi folosită la încărcare (5-10 imagini total)</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className={`rounded-xl overflow-hidden border bg-white shadow-sm ${draggingNewIdx === idx ? 'ring-2 ring-emerald-500' : ''}`}
                    draggable
                    onDragStart={() => handleNewDragStart(idx)}
                    onDragOver={(e) => { e.preventDefault(); handleNewDragOver(idx); }}
                    onDragEnd={handleNewDragEnd}
                  >
                    <div className="relative h-48 bg-gray-50">
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
                        <button type="button" onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))} className="h-8 w-8 rounded-full border text-xs font-semibold text-red-600">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <button type="button" onClick={() => router.back()} className="border px-4 py-2 rounded-lg bg-white shadow-sm">Renunță</button>
            <button type="button" onClick={async () => {
              setMessage(null);
              setLoading(true);
              try {
                let updatedImages = images;
                const totalPlanned = images.length + files.length;
                if (totalPlanned > 10) {
                  setMessage('Poți avea maximum 10 imagini la o cazare (existente + noi).');
                  setLoading(false);
                  setUploading(false);
                  return;
                }
                if (totalPlanned < 5) {
                  setMessage('Adaugă cel puțin 5 imagini înainte de publicare.');
                  setLoading(false);
                  setUploading(false);
                  return;
                }
                if (files.length > 0) {
                  setUploading(true);
                  const fd = new FormData();
                  fd.append('listingId', id);
                  fd.append('startIndex', String(images.length));
                  files.forEach(f => fd.append('files', f));
                  const respUpload = await fetch('/api/listing-upload', { method: 'POST', body: fd });
                  const uploadBody = await respUpload.json();
                  if (!respUpload.ok) throw new Error(uploadBody?.error || 'Eroare la încărcarea imaginilor');
                  const uploaded = (uploadBody?.uploaded || []) as Array<{ id: string; url: string; display_order: number }>;
                  updatedImages = [...images, ...uploaded.map(u => ({ id: u.id, image_url: u.url, alt: null }))];
                  setImages(updatedImages);
                  setFiles([]);
                  setFilePreviews([]);
                  setUploading(false);
                }
                await fetch('/api/listing-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_published: true, title: formData.titlu, slug: formData.titlu ? `${slugify(formData.titlu)}-${id}` : undefined }) });
                if (updatedImages.length > 0) {
                  const idsInOrder = updatedImages.map(img => img.id);
                  await fetch('/api/listing-images/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId: id, ids: idsInOrder }) });
                }
                router.push(`/confirm?action=published&id=${id}&status=published`);
              } catch (err: any) {
                setMessage(err?.message || 'Eroare la publicare');
              } finally {
                setLoading(false);
                setUploading(false);
              }
            }} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 disabled:opacity-60" disabled={loading}>{uploading ? 'Se încarcă...' : 'Publică'}</button>
          </div>
          <button type="submit" disabled={loading} className="bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow hover:bg-emerald-700 disabled:opacity-60">{loading ? 'Se salvează...' : 'Salvează modificări'}</button>
        </div>
        {message && <div className="text-sm text-gray-700">{message}</div>}
      </form>
    </div>
  )
}
