"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminEmptyState, AttractionDraftCard } from "@/components/admin/DraftDashboardParts";
import {
  type AttractionItem,
  type AttractionViewFilter,
  countPublishedAttractions,
  filterVisibleAttractions,
} from "@/lib/admin/draftsDashboard";
import { markPageModified } from "@/hooks/useRefreshOnNavigation";

type Props = {
  attractions: AttractionItem[];
  role: string;
  onStatusMessage: (msg: string | null) => void;
};

type AttractionSort = "newest" | "oldest" | "title";

const primaryActionClassName =
  "rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60";

const secondaryActionClassName =
  "rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300 dark:hover:bg-zinc-800";

const controlClassName =
  "rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200";

function sortAttractions(items: AttractionItem[], sort: AttractionSort) {
  return [...items].sort((first, second) => {
    if (sort === "title") return first.title.localeCompare(second.title, "ro");
    const firstDate = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondDate = second.createdAt ? new Date(second.createdAt).getTime() : 0;
    return sort === "oldest" ? firstDate - secondDate : secondDate - firstDate;
  });
}

export default function ContentSection({ attractions, role, onStatusMessage }: Props) {
  const router = useRouter();
  const [attractionItems, setAttractionItems] = useState(attractions);
  const [attractionFilter, setAttractionFilter] = useState<AttractionViewFilter>("all");
  const [attractionSort, setAttractionSort] = useState<AttractionSort>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [attractionActionLoadingId, setAttractionActionLoadingId] = useState<string | null>(null);

  const canStaffActions = role === "staff" || role === "admin";

  useEffect(() => {
    setAttractionItems(attractions);
  }, [attractions]);

  const attractionsPublishedCount = useMemo(
    () => countPublishedAttractions(attractionItems),
    [attractionItems]
  );
  const attractionsDraftCount = Math.max(0, attractionItems.length - attractionsPublishedCount);

  const visibleAttractions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ro-RO");
    const filtered = filterVisibleAttractions(attractionItems, attractionFilter).filter((item) => {
      if (!normalizedQuery) return true;
      return [item.title, item.locationName]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ro-RO")
        .includes(normalizedQuery);
    });
    return sortAttractions(filtered, attractionSort);
  }, [attractionFilter, attractionItems, attractionSort, searchQuery]);

  const handleAttractionStatusChange = (itemId: string, nextIsPublished: boolean) => {
    setAttractionItems((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? { ...item, isPublished: nextIsPublished, status: nextIsPublished ? "publicat" : "draft" }
          : item
      )
    );
  };

  const toggleAttractionPublish = async (itemId: string, currentIsPublished: boolean) => {
    const nextIsPublished = !currentIsPublished;
    handleAttractionStatusChange(itemId, nextIsPublished);
    setAttractionActionLoadingId(itemId);
    onStatusMessage(null);

    try {
      const response = await fetch("/api/attraction-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, is_published: nextIsPublished }),
      });

      if (response.status === 401) {
        handleAttractionStatusChange(itemId, currentIsPublished);
        router.push("/drafts-login?error=1");
        return;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Nu am putut actualiza statusul atracției.");

      markPageModified();
      router.refresh();
    } catch (error) {
      handleAttractionStatusChange(itemId, currentIsPublished);
      onStatusMessage(error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setAttractionActionLoadingId(null);
    }
  };

  const deleteAttraction = async (itemId: string) => {
    if (!confirm("Sigur vrei să ștergi această atracție?")) return;
    setAttractionActionLoadingId(itemId);
    onStatusMessage(null);

    try {
      const response = await fetch("/api/attraction-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });

      if (response.status === 401) {
        router.push("/drafts-login?error=1");
        return;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Nu am putut șterge atracția.");

      setAttractionItems((previous) => previous.filter((item) => item.id !== itemId));
      onStatusMessage("Atracția a fost ștearsă.");
      markPageModified();
      router.refresh();
    } catch (error) {
      onStatusMessage(error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setAttractionActionLoadingId(null);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setAttractionFilter("all");
    setAttractionSort("newest");
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-[24px] border border-gray-200 bg-white p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.65)] sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h3 className="text-lg font-semibold text-gray-950 dark:text-gray-100">Atracții locale</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Administrează locurile recomandate și starea lor de publicare.
          </p>
        </div>
        {canStaffActions && (
          <button type="button" onClick={() => router.push("/add-attraction")} className={primaryActionClassName}>
            Adaugă atracție
          </button>
        )}
      </div>

      <div className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.6)] dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_210px_180px_auto]">
          <label className="relative block">
            <span className="sr-only">Caută atracții</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Caută după nume sau localitate..."
              className={`${controlClassName} w-full pl-10`}
            />
          </label>

          <label>
            <span className="sr-only">Filtrează după status</span>
            <select
              value={attractionFilter}
              onChange={(event) => setAttractionFilter(event.target.value as AttractionViewFilter)}
              className={`${controlClassName} w-full`}
            >
              <option value="all">Toate ({attractionItems.length})</option>
              <option value="published">Publicate ({attractionsPublishedCount})</option>
              <option value="draft">Draft ({attractionsDraftCount})</option>
            </select>
          </label>

          <label>
            <span className="sr-only">Sortează atracțiile</span>
            <select
              value={attractionSort}
              onChange={(event) => setAttractionSort(event.target.value as AttractionSort)}
              className={`${controlClassName} w-full`}
            >
              <option value="newest">Cele mai noi</option>
              <option value="oldest">Cele mai vechi</option>
              <option value="title">Alfabetic</option>
            </select>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!searchQuery && attractionFilter === "all" && attractionSort === "newest"}
            className={secondaryActionClassName}
          >
            Resetează
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{visibleAttractions.length} din {attractionItems.length} atracții</span>
          {searchQuery.trim() ? <span className="truncate">Rezultate pentru „{searchQuery.trim()}”</span> : null}
        </div>
      </div>

      {attractionItems.length === 0 ? (
        <AdminEmptyState
          title="Nu există încă atracții"
          description="Poți începe cu locurile locale pe care vrei să le recomanzi vizitatorilor."
          actions={
            canStaffActions ? (
              <button type="button" onClick={() => router.push("/add-attraction")} className={primaryActionClassName}>
                Adaugă prima atracție
              </button>
            ) : null
          }
        />
      ) : visibleAttractions.length === 0 ? (
        <AdminEmptyState
          title="Niciun rezultat pentru filtrele curente"
          description="Încearcă alt termen de căutare sau resetează filtrele."
          actions={
            <button type="button" onClick={resetFilters} className={secondaryActionClassName}>
              Resetează filtrele
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visibleAttractions.map((item, index) => (
            <AttractionDraftCard
              key={item.id}
              item={item}
              index={index}
              loading={attractionActionLoadingId === item.id}
              onOpen={() => router.push(`/add-attraction?editId=${item.id}`)}
              onTogglePublish={() => toggleAttractionPublish(item.id, item.isPublished)}
              onDelete={() => deleteAttraction(item.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
