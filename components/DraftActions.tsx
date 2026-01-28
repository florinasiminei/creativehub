"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  isPublished: boolean;
  slug?: string;
  onStatusChange?: (newStatus: "publicat" | "draft") => void;
};

export default function DraftActions({ id, isPublished, slug, onStatusChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const togglePublish = async () => {
    const nextIsPublished = !isPublished;
    const nextStatus = nextIsPublished ? "publicat" : "draft";
    const previousStatus = isPublished ? "publicat" : "draft";
    if (onStatusChange) onStatusChange(nextStatus);
    setLoading(true);
    try {
      const response = await fetch("/api/listing-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_published: nextIsPublished }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Nu am putut actualiza statusul.");
      }
      if (!onStatusChange) router.refresh();
    } catch (error) {
      if (onStatusChange) onStatusChange(previousStatus);
      else router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!confirm("Sigur vrei sa stergi aceasta cazare?")) return;
    setLoading(true);
    try {
      await fetch("/api/listing-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const viewHref = slug ? (isPublished ? `/cazare/${slug}` : `/cazare/${slug}?preview=1&id=${id}`) : "";

  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      <a
        href={`/edit-property/${id}`}
        className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg text-center hover:bg-gray-200"
      >
        Editează
      </a>
      <button
        onClick={togglePublish}
        className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg disabled:opacity-60"
        disabled={loading}
      >
        {isPublished ? "Retrage (draft)" : "Publică"}
      </button>
      <button
        onClick={remove}
        className="px-3 py-2 text-xs font-medium bg-red-100 text-red-700 rounded-lg disabled:opacity-60"
        disabled={loading}
      >
        Șterge
      </button>
      {slug && (
        <a
          href={viewHref}
          className="px-3 py-2 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg text-center hover:bg-emerald-100"
        >
          Vezi
        </a>
      )}
    </div>
  );
}
