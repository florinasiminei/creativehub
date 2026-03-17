"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { copyTextToClipboard } from "@/lib/copyToClipboard";

type Props = {
  id: string;
  isPublished: boolean;
  slug?: string;
  canDelete?: boolean;
  clientLink?: string | null;
  onStatusChange?: (newStatus: "publicat" | "draft") => void;
};

export default function DraftActions({
  id,
  isPublished,
  slug,
  canDelete = true,
  clientLink,
  onStatusChange,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const togglePublish = async () => {
    const nextIsPublished = !isPublished;
    const nextStatus = nextIsPublished ? "publicat" : "draft";
    const previousStatus = isPublished ? "publicat" : "draft";

    onStatusChange?.(nextStatus);
    setLoading(true);

    try {
      const response = await fetch("/api/listing-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_published: nextIsPublished }),
      });

      if (response.status === 401) {
        onStatusChange?.(previousStatus);
        router.push("/drafts-login?error=1");
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Nu am putut actualiza statusul.");
      }

      if (!onStatusChange) router.refresh();
    } catch {
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
      const response = await fetch("/api/listing-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.status === 401) {
        router.push("/drafts-login?error=1");
        return;
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const copyClientLink = async () => {
    if (!clientLink) return;

    const copiedOk = await copyTextToClipboard(clientLink);
    if (!copiedOk) return;

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const viewHref = slug ? (isPublished ? `/cazare/${slug}` : `/cazare/${slug}?preview=1&id=${id}`) : "";
  const actionClassName =
    "inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-xl px-2.5 py-2 text-center text-[11px] font-medium leading-none tracking-[-0.01em] transition disabled:opacity-60 sm:text-xs";

  return (
    <div className="mt-3 grid grid-cols-2 gap-1.5">
      <Link
        href={`/edit-property/${id}`}
        className={`${actionClassName} bg-gray-100 text-gray-700 hover:bg-gray-200`}
      >
        Editeaza
      </Link>

      <button
        type="button"
        onClick={togglePublish}
        className={`${actionClassName} bg-blue-600 text-white hover:bg-blue-700`}
        disabled={loading}
      >
        {isPublished ? "Retrage (draft)" : "Publica"}
      </button>

      {canDelete && (
        <button
          type="button"
          onClick={remove}
          className={`${actionClassName} bg-red-100 text-red-700 hover:bg-red-200`}
          disabled={loading}
        >
          Sterge
        </button>
      )}

      {clientLink && (
        <button
          type="button"
          onClick={copyClientLink}
          className={`${actionClassName} bg-emerald-600 text-white hover:bg-emerald-700`}
          disabled={loading}
        >
          {copied ? "Copiat" : "Link edit"}
        </button>
      )}

      {slug && (
        <Link
          href={viewHref}
          className={`${actionClassName} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
        >
          Vezi
        </Link>
      )}
    </div>
  );
}
