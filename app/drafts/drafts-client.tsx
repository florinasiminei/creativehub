"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import DraftActions from "@/components/DraftActions";
import type { Cazare } from "@/lib/utils";

type DraftItem = Cazare & {
  status: "publicat" | "inactiv" | "draft";
  isPublished: boolean;
};

type Props = {
  listings: DraftItem[];
  role: string;
  inviteToken?: string | null;
  siteUrl?: string | null;
};

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex == toIndex || fromIndex < 0 || toIndex < 0) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function DraftsClient({ listings, role, inviteToken = null, siteUrl = null }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ordered, setOrdered] = useState(listings);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showUpdatedNotice, setShowUpdatedNotice] = useState(false);
  const [showCreatedNotice, setShowCreatedNotice] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const canDelete = role == "admin";
  const canStaffActions = role == "staff" || role == "admin";

  const baseUrl = useMemo(() => {
    if (siteUrl) return siteUrl.replace(/\/$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, [siteUrl]);

  useEffect(() => {
    const updated = searchParams.get("updated") == "1";
    setShowUpdatedNotice(updated);
    const created = searchParams.get("created") == "1";
    setShowCreatedNotice(created);
    setCreatedId(searchParams.get("id"));
  }, [searchParams]);

  useEffect(() => {
    setOrdered(listings);
  }, [listings]);

  const handleStatusChange = (itemId: string, newStatus: "publicat" | "draft") => {
    setOrdered((prev) =>
      prev.map((item) =>
        item.id == itemId
          ? { ...item, status: newStatus, isPublished: newStatus == "publicat" }
          : item
      )
    );
  };

  const initialIds = useMemo(() => listings.map((item) => item.id), [listings]);
  const isDirty = useMemo(() => {
    if (ordered.length != initialIds.length) return true;
    return ordered.some((item, index) => item.id != initialIds[index]);
  }, [ordered, initialIds]);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId == targetId) return;
    setOrdered((prev) => {
      const fromIndex = prev.findIndex((item) => item.id == dragId);
      const toIndex = prev.findIndex((item) => item.id == targetId);
      if (fromIndex == -1 || toIndex == -1) return prev;
      return moveItem(prev, fromIndex, toIndex);
    });
    setDragId(null);
    setOverId(null);
  };

  const saveOrder = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const ids = ordered.map((item) => item.id);
      const resp = await fetch("/api/listing-reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || "Nu am putut salva ordinea.");
      setStatusMessage("Ordinea a fost salvată.");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setSaving(false);
    }
  };

  const resetOrder = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const ids = ordered.map((item) => item.id);
      const resp = await fetch("/api/listing-reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, reset: true }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || "Nu am putut reseta ordinea.");
      setStatusMessage("Ordinea a fost resetată.");
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setSaving(false);
    }
  };

  const handleStaffAdd = () => {
    if (!inviteToken) return;
    try {
      sessionStorage.setItem("invite_token", inviteToken);
    } catch {
      // ignore storage issues
    }
    router.push("/add-property");
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[120rem] mx-auto dark:text-gray-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300 font-semibold">Administrare cazări</p>
          <h1 className="text-3xl font-semibold mt-2">Toate listările (draft + publicate)</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Editează, publică sau șterge orice intrare direct din acest panou.</p>
        </div>
        <div className="flex items-center gap-2">
          {canStaffActions && inviteToken && (
            <button
              type="button"
              onClick={handleStaffAdd}
              className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Adaugă proprietate
            </button>
          )}
          <div className="text-sm text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            Total: {ordered.length}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">Trage și lasă cardurile pentru reordonare. Salvează când ai terminat.</p>
        <div className="flex items-center gap-2">
          {statusMessage && <span className="text-xs text-gray-500 dark:text-gray-400">{statusMessage}</span>}
          <button
            onClick={resetOrder}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 disabled:opacity-60"
            disabled={saving || !isDirty}
          >
            Resetează ordinea
          </button>
          <button
            onClick={saveOrder}
            className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white disabled:opacity-60"
            disabled={saving || !isDirty}
          >
            {saving ? "Se salvează..." : "Salvează ordinea"}
          </button>
        </div>
      </div>

      {ordered.length == 0 && <div className="text-sm text-gray-700 dark:text-gray-300">Nu există listări.</div>}
      {showUpdatedNotice && (
        <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <span>Modificările au fost salvate cu succes.</span>
          <button
            type="button"
            onClick={() => setShowUpdatedNotice(false)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900"
            aria-label="Închide"
          >
            ×
          </button>
        </div>
      )}
      {showCreatedNotice && (
        <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <span>
            Anunț nou creat și salvat ca draft{createdId ? ` (id: ${createdId})` : ""}.
          </span>
          <button
            type="button"
            onClick={() => setShowCreatedNotice(false)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900"
            aria-label="Închide"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5">
        {ordered.map((d, index) => {
          const isDragging = dragId == d.id;
          const isOver = overId == d.id && dragId != d.id;
          const detailsHref = `/edit-property/${d.id}`;
          return (
            <div
              key={d.id}
              draggable
              onDragStart={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button") || target.closest("a")) {
                  event.preventDefault();
                  return;
                }
                event.dataTransfer.effectAllowed = "move";
                setDragId(d.id);
              }}
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (dragId || target.closest("button") || target.closest("a")) return;
                router.push(detailsHref);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (overId != d.id) setOverId(d.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(d.id);
              }}
              className={`border rounded-2xl shadow-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 cursor-grab active:cursor-grabbing transition ${
                isDragging ? "opacity-60" : ""
              } ${isOver ? "ring-2 ring-emerald-400" : ""}`}
            >
              <div className="relative aspect-[2.7/2] overflow-hidden rounded-t-2xl">
                <Image
                  src={d.image}
                  alt={d.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 16vw"
                  className="object-cover"
                  priority={index < 2}
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200">{d.tip}</span>
                  <span
                    className={`px-2 py-1 rounded-full ${
                      d.status == "publicat"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : d.status == "inactiv"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                        : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                    }`}
                  >
                    {d.status == "publicat" ? "Publicat" : d.status == "inactiv" ? "Inactiv" : "Draft"}
                  </span>
                </div>
                <div className="pt-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base line-clamp-1 text-gray-900 dark:text-gray-100">{d.title}</h3>
                    <div className="text-gray-900 dark:text-gray-100 text-sm font-semibold whitespace-nowrap">{d.price} lei</div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span className="truncate max-w-[60%]">{d.locatie}</span>
                    <span className="shrink-0">{d.numarPersoane} pers</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100 dark:border-zinc-800">
                  <DraftActions
                    id={d.id}
                    isPublished={d.isPublished}
                    slug={d.slug}
                    canDelete={canDelete}
                    clientLink={
                      canStaffActions
                        ? `${baseUrl || ""}/edit-property/${d.id}?client=1`
                        : null
                    }
                    onStatusChange={(newStatus) => handleStatusChange(d.id, newStatus)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
