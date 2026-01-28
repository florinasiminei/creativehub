"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DraftActions from "@/components/DraftActions";
import type { Cazare } from "@/lib/utils";

type DraftItem = Cazare & {
  status: "publicat" | "inactiv" | "draft";
  isPublished: boolean;
};

type Props = {
  listings: DraftItem[];
};

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function DraftsClient({ listings }: Props) {
  const router = useRouter();
  const [ordered, setOrdered] = useState(listings);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setOrdered(listings);
  }, [listings]);

  const handleStatusChange = (itemId: string, newStatus: "publicat" | "draft") => {
    setOrdered((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, status: newStatus, isPublished: newStatus === "publicat" }
          : item
      )
    );
  };

  const initialIds = useMemo(() => listings.map((item) => item.id), [listings]);
  const isDirty = useMemo(() => {
    if (ordered.length !== initialIds.length) return true;
    return ordered.some((item, index) => item.id !== initialIds[index]);
  }, [ordered, initialIds]);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setOrdered((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === dragId);
      const toIndex = prev.findIndex((item) => item.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[120rem] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">Administrare cazari</p>
          <h1 className="text-3xl font-semibold mt-2">Toate listarile (draft + publicate)</h1>
          <p className="text-sm text-gray-600 mt-1">Editeaza, publica sau sterge orice intrare direct din acest panou.</p>
        </div>
        <div className="text-sm text-gray-700 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">Total: {ordered.length}</div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <p className="text-sm text-gray-600">Trage si lasa cardurile pentru reordonare. Salveaza cand ai terminat.</p>
        <div className="flex items-center gap-2">
          {statusMessage && <span className="text-xs text-gray-500">{statusMessage}</span>}
          <button
            onClick={resetOrder}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 disabled:opacity-60"
            disabled={saving || !isDirty}
          >
            Reseteaza ordinea
          </button>
          <button
            onClick={saveOrder}
            className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white disabled:opacity-60"
            disabled={saving || !isDirty}
          >
            {saving ? "Se salveaza..." : "Salveaza ordinea"}
          </button>
        </div>
      </div>

      {ordered.length === 0 && <div className="text-sm text-gray-700">Nu exista listari.</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5">
        {ordered.map((d) => {
          const isDragging = dragId === d.id;
          const isOver = overId === d.id && dragId !== d.id;
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
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (overId !== d.id) setOverId(d.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(d.id);
              }}
              className={`border rounded-2xl shadow-sm bg-white cursor-grab active:cursor-grabbing transition ${
                isDragging ? "opacity-60" : ""
              } ${isOver ? "ring-2 ring-emerald-400" : ""}`}
            >
              <div className="relative aspect-[2.7/2] overflow-hidden rounded-t-2xl">
                <img src={d.image} className="h-full w-full object-cover" alt={d.title} />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{d.tip}</span>
                  <span
                    className={`px-2 py-1 rounded-full ${
                      d.status === "publicat"
                        ? "bg-emerald-100 text-emerald-700"
                        : d.status === "inactiv"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {d.status === "publicat" ? "Publicat" : d.status === "inactiv" ? "Inactiv" : "Draft"}
                  </span>
                </div>
                <div className="pt-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base line-clamp-1 text-gray-900">{d.title}</h3>
                    <div className="text-gray-900 text-sm font-semibold whitespace-nowrap">{d.price} lei</div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="truncate max-w-[60%]">{d.locatie}</span>
                    <span className="shrink-0">{d.numarPersoane} pers</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <DraftActions
                    id={d.id}
                    isPublished={d.isPublished}
                    slug={d.slug}
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
