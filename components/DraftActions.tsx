"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  id: string;
  isPublished: boolean;
  slug?: string;
};

export default function DraftActions({ id, isPublished, slug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const togglePublish = async () => {
    setLoading(true);
    await fetch('/api/listing-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_published: !isPublished }) });
    setLoading(false);
    router.refresh();
  };

  const remove = async () => {
    if (!confirm('Sigur vrei să ștergi această cazare?')) return;
    setLoading(true);
    await fetch('/api/listing-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 mt-3 flex-wrap">
      <a href={`/edit-property/${id}`} className="px-3 py-1 bg-gray-100 rounded">Editează</a>
      <button onClick={togglePublish} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-60" disabled={loading}>
        {isPublished ? 'Retrage (draft)' : 'Publică'}
      </button>
      <button onClick={remove} className="px-3 py-1 bg-red-100 text-red-700 rounded disabled:opacity-60" disabled={loading}>Șterge</button>
      {slug && <a href={`/cazare/${slug}?preview=1&id=${id}`} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded">Vezi</a>}
    </div>
  );
}
