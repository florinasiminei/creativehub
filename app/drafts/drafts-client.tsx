"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import DraftActions from "@/components/DraftActions";
import { useRefreshOnNavigation, markPageModified } from "@/hooks/useRefreshOnNavigation";
import type { Cazare } from "@/lib/utils";

type DraftItem = Cazare & {
  status: "publicat" | "inactiv" | "draft";
  isPublished: boolean;
  termsAccepted?: boolean;
  editToken?: string | null;
};

type AttractionItem = {
  id: string;
  title: string;
  slug?: string;
  locationName: string;
  price: number | null;
  image: string;
  isPublished: boolean;
  status: "publicat" | "draft";
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Props = {
  listings: DraftItem[];
  attractions: AttractionItem[];
  role: string;
  inviteToken?: string | null;
  siteUrl?: string | null;
};

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function DraftsClient({
  listings,
  attractions,
  role,
  inviteToken = null,
  siteUrl = null,
}: Props) {
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
  const [copiedAddLink, setCopiedAddLink] = useState(false);
  const [activeTab, setActiveTab] = useState<"properties" | "attractions">("properties");
  const [viewFilter, setViewFilter] = useState<"all" | "client_unpublished">("all");
  const [attractionFilter, setAttractionFilter] = useState<"all" | "published" | "draft">("all");
  const [attractionItems, setAttractionItems] = useState(attractions);
  const [attractionActionLoadingId, setAttractionActionLoadingId] = useState<string | null>(null);

  const canDelete = role === "admin";
  const canStaffActions = role === "staff" || role === "admin";

  const baseUrl = useMemo(() => {
    if (siteUrl) return siteUrl.replace(/\/$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, [siteUrl]);

  useRefreshOnNavigation("drafts");

  useEffect(() => {
    const updated = searchParams.get("updated") === "1";
    setShowUpdatedNotice(updated);
    const created = searchParams.get("created") === "1";
    setShowCreatedNotice(created);
    setCreatedId(searchParams.get("id"));
  }, [searchParams]);

  useEffect(() => {
    setOrdered(listings);
  }, [listings]);

  useEffect(() => {
    setAttractionItems(attractions);
  }, [attractions]);

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
  const publishedCount = useMemo(() => ordered.filter((item) => item.isPublished).length, [ordered]);
  const clientCompletedCount = useMemo(
    () => ordered.filter((item) => Boolean(item.termsAccepted)).length,
    [ordered]
  );
  const clientUnpublishedCount = useMemo(
    () => ordered.filter((item) => Boolean(item.termsAccepted) && !item.isPublished).length,
    [ordered]
  );

  const visibleItems = useMemo(
    () =>
      viewFilter === "client_unpublished"
        ? ordered.filter((item) => Boolean(item.termsAccepted) && !item.isPublished)
        : ordered,
    [ordered, viewFilter]
  );

  const canReorder = viewFilter === "all";

  const attractionsPublishedCount = useMemo(
    () => attractionItems.filter((item) => item.isPublished).length,
    [attractionItems]
  );
  const visibleAttractions = useMemo(() => {
    if (attractionFilter === "published") return attractionItems.filter((item) => item.isPublished);
    if (attractionFilter === "draft") return attractionItems.filter((item) => !item.isPublished);
    return attractionItems;
  }, [attractionItems, attractionFilter]);

  const isDirty = useMemo(() => {
    if (ordered.length !== initialIds.length) return true;
    return ordered.some((item, index) => item.id !== initialIds[index]);
  }, [ordered, initialIds]);

  const handleDrop = (targetId: string) => {
    if (!canReorder || !dragId || dragId === targetId) return;
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
      if (resp.status === 401) {
        router.push("/drafts-login?error=1");
        return;
      }
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || "Nu am putut salva ordinea.");
      setStatusMessage("Ordinea a fost salvata.");
      markPageModified();
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "A aparut o eroare.");
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
      if (resp.status === 401) {
        router.push("/drafts-login?error=1");
        return;
      }
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || "Nu am putut reseta ordinea.");
      setStatusMessage("Ordinea a fost resetata.");
      markPageModified();
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "A aparut o eroare.");
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

  const handleStaffAddAttraction = () => {
    if (inviteToken) {
      try {
        sessionStorage.setItem("invite_token", inviteToken);
      } catch {
        // ignore storage issues
      }
    }
    router.push("/add-attraction");
  };

  const copyAddPropertyLink = async () => {
    if (!inviteToken) return;
    const link = `${baseUrl || ""}/add-property?client=1&token=${inviteToken}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const input = document.createElement("textarea");
        input.value = link;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.focus();
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedAddLink(true);
      window.setTimeout(() => setCopiedAddLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleAttractionStatusChange = (itemId: string, nextIsPublished: boolean) => {
    setAttractionItems((prev) =>
      prev.map((item) =>
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
    try {
      const resp = await fetch("/api/attraction-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, is_published: nextIsPublished }),
      });
      if (resp.status === 401) {
        handleAttractionStatusChange(itemId, currentIsPublished);
        router.push("/drafts-login?error=1");
        return;
      }
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(body?.error || "Nu am putut actualiza statusul atractiei.");
      markPageModified();
    } catch (error) {
      handleAttractionStatusChange(itemId, currentIsPublished);
      setStatusMessage(error instanceof Error ? error.message : "A aparut o eroare.");
    } finally {
      setAttractionActionLoadingId(null);
    }
  };

  const deleteAttraction = async (itemId: string) => {
    if (!confirm("Sigur vrei sa stergi aceasta atractie?")) return;
    setAttractionActionLoadingId(itemId);
    try {
      const resp = await fetch("/api/attraction-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });
      if (resp.status === 401) {
        router.push("/drafts-login?error=1");
        return;
      }
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(body?.error || "Nu am putut sterge atractia.");
      setAttractionItems((prev) => prev.filter((item) => item.id !== itemId));
      markPageModified();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "A aparut o eroare.");
    } finally {
      setAttractionActionLoadingId(null);
    }
  };

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[120rem] mx-auto dark:text-gray-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300 font-semibold">
            Administrare continut
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-2">
            {activeTab === "properties" ? "Toate listarile (draft + publicate)" : "Toate atractiile"}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {activeTab === "properties"
              ? "Editeaza, publica sau sterge orice proprietate direct din acest panou."
              : "Editeaza, publica sau sterge orice atractie direct din acest panou."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveTab("properties")}
                className={`px-4 py-2 text-sm ${
                  activeTab === "properties"
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-gray-700 dark:bg-zinc-900 dark:text-gray-200"
                }`}
              >
                Proprietati
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("attractions")}
                className={`px-4 py-2 text-sm border-l border-gray-200 dark:border-zinc-700 ${
                  activeTab === "attractions"
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-gray-700 dark:bg-zinc-900 dark:text-gray-200"
                }`}
              >
                Atractii
              </button>
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={() => router.push("/admin-seo")}
                className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-100 dark:hover:bg-zinc-700"
              >
                Dashboard SEO
              </button>
            )}
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-2">
          <div className="flex w-full sm:w-auto flex-wrap items-center justify-stretch sm:justify-end gap-2">
            {activeTab === "properties" && canStaffActions && inviteToken && (
              <button
                type="button"
                onClick={handleStaffAdd}
                className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Adauga proprietate
              </button>
            )}
            {activeTab === "attractions" && canStaffActions && (
              <button
                type="button"
                onClick={handleStaffAddAttraction}
                className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Adauga atractie
              </button>
            )}
            {activeTab === "properties" && canStaffActions && inviteToken && (
              <button
                type="button"
                onClick={copyAddPropertyLink}
                className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              >
                {copiedAddLink ? "Link copiat" : "Copiaza link adaugare"}
              </button>
            )}
          </div>
          <div className="flex w-full sm:w-auto flex-wrap items-center justify-stretch sm:justify-end gap-2">
            {activeTab === "properties" ? (
              <>
                <div className="text-sm text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  Total: {ordered.length}
                  {canDelete ? ` | Publicate: ${publishedCount}` : ""}
                </div>
                {canStaffActions && (
                  <div className="text-sm text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                    Completate de client: {clientCompletedCount}
                  </div>
                )}
                {canStaffActions && (
                  <div className="text-sm text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                    Client + nepublicate: {clientUnpublishedCount}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                Total atractii: {attractionItems.length} | Publicate: {attractionsPublishedCount}
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTab === "properties" ? (
        <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={() => setViewFilter("all")}
            className={`w-full sm:w-auto px-3 py-2 text-sm rounded-lg border text-center ${
              viewFilter === "all"
                ? "border-emerald-500 bg-emerald-600 text-white"
                : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Toate ({ordered.length})
          </button>
          <button
            type="button"
            onClick={() => setViewFilter("client_unpublished")}
            className={`w-full sm:w-auto px-3 py-2 text-sm rounded-lg border text-center ${
              viewFilter === "client_unpublished"
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Nepublicate + completate client ({clientUnpublishedCount})
          </button>
        </div>
      ) : (
        <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          <button
            type="button"
            onClick={() => setAttractionFilter("all")}
            className={`w-full sm:w-auto px-3 py-2 text-sm rounded-lg border text-center ${
              attractionFilter === "all"
                ? "border-emerald-500 bg-emerald-600 text-white"
                : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Toate ({attractionItems.length})
          </button>
          <button
            type="button"
            onClick={() => setAttractionFilter("published")}
            className={`w-full sm:w-auto px-3 py-2 text-sm rounded-lg border text-center ${
              attractionFilter === "published"
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Publicate ({attractionsPublishedCount})
          </button>
          <button
            type="button"
            onClick={() => setAttractionFilter("draft")}
            className={`w-full sm:w-auto px-3 py-2 text-sm rounded-lg border text-center ${
              attractionFilter === "draft"
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Draft ({Math.max(0, attractionItems.length - attractionsPublishedCount)})
          </button>
        </div>
      )}

      {activeTab === "properties" ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {canReorder
              ? "Trage si lasa cardurile pentru reordonare. Salveaza cand ai terminat."
              : "Reordonarea este disponibila doar in view-ul Toate."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {statusMessage && <span className="text-xs text-gray-500 dark:text-gray-400">{statusMessage}</span>}
            <button
              onClick={resetOrder}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 disabled:opacity-60"
              disabled={saving || !isDirty || !canReorder}
            >
              Reseteaza ordinea
            </button>
            <button
              onClick={saveOrder}
              className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white disabled:opacity-60"
              disabled={saving || !isDirty || !canReorder}
            >
              {saving ? "Se salveaza..." : "Salveaza ordinea"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Poti edita, publica, retrage in draft sau sterge atractiile direct din carduri.
          </p>
          {statusMessage && <span className="text-xs text-gray-500 dark:text-gray-400">{statusMessage}</span>}
        </div>
      )}

      {activeTab === "properties" && ordered.length === 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-6 text-sm text-emerald-900">
          <h2 className="text-lg font-semibold mb-2">Nu exista inca listari</h2>
          <p className="text-emerald-900/80 mb-4">
            Catalogul este gol. Poti incepe sa adaugi proprietati reale, una cate una, in ordinea dorita.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {canStaffActions && inviteToken && (
              <button
                type="button"
                onClick={handleStaffAdd}
                className="px-3 py-2 text-sm rounded-lg bg-emerald-700 text-white hover:bg-emerald-800"
              >
                Adauga prima proprietate
              </button>
            )}
            {canStaffActions && inviteToken && (
              <button
                type="button"
                onClick={copyAddPropertyLink}
                className="px-3 py-2 text-sm rounded-lg border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
              >
                {copiedAddLink ? "Link copiat" : "Copiaza link adaugare"}
              </button>
            )}
            {!inviteToken && (
              <span className="text-emerald-800/80">Ai nevoie de un link de invitatie pentru a adauga.</span>
            )}
          </div>
        </div>
      )}

      {activeTab === "attractions" && attractionItems.length === 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-6 text-sm text-emerald-900">
          <h2 className="text-lg font-semibold mb-2">Nu exista inca atractii</h2>
          <p className="text-emerald-900/80 mb-4">
            Poti incepe sa adaugi atractii locale pe care sa le folosesti ulterior la sectiunea din apropiere.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {canStaffActions && (
              <button
                type="button"
                onClick={handleStaffAddAttraction}
                className="px-3 py-2 text-sm rounded-lg bg-emerald-700 text-white hover:bg-emerald-800"
              >
                Adauga prima atractie
              </button>
            )}
          </div>
        </div>
      )}

      {showUpdatedNotice && (
        <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <span>Modificarile au fost salvate cu succes.</span>
          <button
            type="button"
            onClick={() => setShowUpdatedNotice(false)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900"
            aria-label="Inchide"
          >
            ×
          </button>
        </div>
      )}

      {showCreatedNotice && (
        <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <span>
            Anunt nou creat si salvat ca draft{createdId ? ` (id: ${createdId})` : ""}.
          </span>
          <button
            type="button"
            onClick={() => setShowCreatedNotice(false)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900"
            aria-label="Inchide"
          >
            ×
          </button>
        </div>
      )}

      {activeTab === "properties" && ordered.length > 0 && visibleItems.length === 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-5 py-6 text-sm text-amber-900">
          Nu exista momentan listari care sa fie completate de client si nepublicate.
        </div>
      )}

      {activeTab === "attractions" && attractionItems.length > 0 && visibleAttractions.length === 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-5 py-6 text-sm text-amber-900">
          Nu exista atractii pentru filtrul selectat.
        </div>
      )}

      {activeTab === "properties" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
          {visibleItems.map((d, index) => {
            const isDragging = dragId === d.id;
            const isOver = overId === d.id && dragId !== d.id;
            const detailsHref = `/edit-property/${d.id}`;

            return (
              <div
                key={d.id}
                draggable={canReorder}
                onDragStart={(event) => {
                  if (!canReorder) return;
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
                  if (!canReorder) return;
                  event.preventDefault();
                  if (overId !== d.id) setOverId(d.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(d.id);
                }}
                className={`border rounded-2xl shadow-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 transition ${
                  canReorder ? "cursor-grab active:cursor-grabbing" : ""
                } ${isDragging ? "opacity-60" : ""} ${isOver ? "ring-2 ring-emerald-400" : ""}`}
              >
                <div className="relative aspect-[2.7/2] overflow-hidden rounded-t-2xl">
                  <Image
                    src={d.image}
                    alt={d.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    priority={index < 2}
                  />
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200">
                      {d.tip}
                    </span>
                    {d.termsAccepted && (
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                        Client completat
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 rounded-full ${
                        d.status === "publicat"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : d.status === "inactiv"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
                          : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                      }`}
                    >
                      {d.status === "publicat" ? "Publicat" : d.status === "inactiv" ? "Inactiv" : "Draft"}
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
                        canStaffActions && d.editToken
                          ? `${baseUrl || ""}/edit-property/${d.id}?client=1&token=${d.editToken}`
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
          {visibleAttractions.map((a, index) => {
            const actionLoading = attractionActionLoadingId === a.id;
            return (
              <div
                key={a.id}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest("button") || target.closest("a")) return;
                  router.push(`/add-attraction?editId=${a.id}`);
                }}
                className="border rounded-2xl shadow-sm bg-white dark:bg-zinc-900 dark:border-zinc-800 transition cursor-pointer"
              >
                <div className="relative aspect-[2.7/2] overflow-hidden rounded-t-2xl">
                  <Image
                    src={a.image}
                    alt={a.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    priority={index < 2}
                  />
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200">
                      Atractie
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full ${
                        a.isPublished
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                      }`}
                    >
                      {a.isPublished ? "Publicat" : "Draft"}
                    </span>
                  </div>

                  <div className="pt-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-base line-clamp-1 text-gray-900 dark:text-gray-100">
                        {a.title}
                      </h3>
                      {a.price !== null && a.price > 0 ? (
                        <div className="text-gray-900 dark:text-gray-100 text-sm font-semibold whitespace-nowrap">
                          {a.price} lei
                        </div>
                      ) : null}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{a.locationName}</div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-zinc-800">
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <a
                        href={`/add-attraction?editId=${a.id}`}
                        className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg text-center hover:bg-gray-200"
                      >
                        Editeaza
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleAttractionPublish(a.id, a.isPublished)}
                        className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg disabled:opacity-60"
                        disabled={actionLoading}
                      >
                        {a.isPublished ? "Retrage (draft)" : "Publica"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAttraction(a.id)}
                        className="px-3 py-2 text-xs font-medium bg-red-100 text-red-700 rounded-lg disabled:opacity-60"
                        disabled={actionLoading}
                      >
                        Sterge
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

