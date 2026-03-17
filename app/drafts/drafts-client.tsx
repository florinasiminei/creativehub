"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminPageShell from "@/components/admin/AdminPageShell";
import {
  AdminEmptyState,
  AdminNotice,
  AttractionDraftCard,
  FilterButton,
  PropertyDraftCard,
  SummaryChip,
} from "@/components/admin/DraftDashboardParts";
import { markPageModified, useRefreshOnNavigation } from "@/hooks/useRefreshOnNavigation";
import { copyTextToClipboard } from "@/lib/copyToClipboard";
import {
  countClientCompletedListings,
  countClientUnpublishedListings,
  countPublishedAttractions,
  countPublishedListings,
  filterVisibleAttractions,
  filterVisibleListings,
  hasListingOrderChanged,
  moveItem,
  type AttractionItem,
  type AttractionViewFilter,
  type DraftItem,
  type DraftTab,
  type PropertyViewFilter,
} from "@/lib/admin/draftsDashboard";

type Props = {
  listings: DraftItem[];
  attractions: AttractionItem[];
  role: string;
  inviteToken?: string | null;
  siteUrl?: string | null;
};

const primaryActionClassName =
  "rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800";

const secondaryActionClassName =
  "rounded-full border border-emerald-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50";

function persistInviteToken(inviteToken: string | null | undefined) {
  if (!inviteToken) return;

  try {
    sessionStorage.setItem("invite_token", inviteToken);
  } catch {
    // Ignore storage errors and continue the navigation.
  }
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
  const [activeTab, setActiveTab] = useState<DraftTab>("properties");
  const [viewFilter, setViewFilter] = useState<PropertyViewFilter>("all");
  const [attractionFilter, setAttractionFilter] = useState<AttractionViewFilter>("all");
  const [attractionItems, setAttractionItems] = useState(attractions);
  const [attractionActionLoadingId, setAttractionActionLoadingId] = useState<string | null>(null);

  const canStaffActions = role === "staff" || role === "admin";
  const canDelete = canStaffActions;

  const baseUrl = useMemo(() => {
    if (siteUrl) return siteUrl.replace(/\/$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, [siteUrl]);

  useRefreshOnNavigation("drafts");

  useEffect(() => {
    setShowUpdatedNotice(searchParams.get("updated") === "1");
    setShowCreatedNotice(searchParams.get("created") === "1");
    setCreatedId(searchParams.get("id"));
  }, [searchParams]);

  useEffect(() => {
    setOrdered(listings);
  }, [listings]);

  useEffect(() => {
    setAttractionItems(attractions);
  }, [attractions]);

  const initialIds = useMemo(() => listings.map((item) => item.id), [listings]);
  const publishedCount = useMemo(() => countPublishedListings(ordered), [ordered]);
  const clientCompletedCount = useMemo(() => countClientCompletedListings(ordered), [ordered]);
  const clientUnpublishedCount = useMemo(() => countClientUnpublishedListings(ordered), [ordered]);
  const attractionsPublishedCount = useMemo(() => countPublishedAttractions(attractionItems), [attractionItems]);

  const visibleItems = useMemo(() => filterVisibleListings(ordered, viewFilter), [ordered, viewFilter]);
  const visibleAttractions = useMemo(
    () => filterVisibleAttractions(attractionItems, attractionFilter),
    [attractionItems, attractionFilter]
  );

  const canReorder = viewFilter === "all";
  const isDirty = useMemo(() => hasListingOrderChanged(ordered, initialIds), [ordered, initialIds]);

  const handleStatusChange = (itemId: string, newStatus: "publicat" | "draft") => {
    setOrdered((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: newStatus, isPublished: newStatus === "publicat" } : item
      )
    );
  };

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

  const saveOrder = async (reset = false) => {
    setSaving(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/listing-reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ordered.map((item) => item.id), ...(reset ? { reset: true } : {}) }),
      });

      if (response.status === 401) {
        router.push("/drafts-login?error=1");
        return;
      }

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || (reset ? "Nu am putut reseta ordinea." : "Nu am putut salva ordinea."));
      }

      setStatusMessage(reset ? "Ordinea a fost resetata." : "Ordinea a fost salvata.");
      markPageModified();
      router.refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "A aparut o eroare.");
    } finally {
      setSaving(false);
    }
  };

  const handleStaffAdd = () => {
    persistInviteToken(inviteToken);
    router.push("/add-property");
  };

  const handleStaffAddAttraction = () => {
    persistInviteToken(inviteToken);
    router.push("/add-attraction");
  };

  const copyAddPropertyLink = async () => {
    if (!inviteToken) return;
    const copiedOk = await copyTextToClipboard(`${baseUrl}/add-property?client=1&token=${inviteToken}`);
    if (!copiedOk) return;

    setCopiedAddLink(true);
    window.setTimeout(() => setCopiedAddLink(false), 2000);
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
      if (!response.ok) throw new Error(body?.error || "Nu am putut actualiza statusul atractiei.");

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
      if (!response.ok) throw new Error(body?.error || "Nu am putut sterge atractia.");

      setAttractionItems((prev) => prev.filter((item) => item.id !== itemId));
      markPageModified();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "A aparut o eroare.");
    } finally {
      setAttractionActionLoadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[120rem] px-3 py-6 dark:text-gray-100 sm:px-6 sm:py-8 lg:px-8">
      <AdminPageShell
        eyebrow="Administrare continut"
        title={activeTab === "properties" ? "Dashboard proprietati" : "Dashboard atractii"}
        description={
          activeTab === "properties"
            ? "Editezi, publici, stergi si reordonezi proprietatile din catalog, inclusiv cele completate de clienti."
            : "Administrezi atractiile locale, statusul lor si accesul rapid catre editare."
        }
        actions={
          <div className="flex flex-col gap-2">
            {activeTab === "properties" && canStaffActions && inviteToken && (
              <>
                <button type="button" onClick={handleStaffAdd} className={primaryActionClassName}>
                  Adauga proprietate
                </button>
                <button type="button" onClick={copyAddPropertyLink} className={secondaryActionClassName}>
                  {copiedAddLink ? "Link copiat" : "Copiaza link client"}
                </button>
              </>
            )}
            {activeTab === "attractions" && canStaffActions && (
              <button type="button" onClick={handleStaffAddAttraction} className={primaryActionClassName}>
                Adauga atractie
              </button>
            )}
            {canDelete && (
              <Link href="/admin-seo" className={`inline-flex items-center justify-center ${secondaryActionClassName}`}>
                Dashboard SEO
              </Link>
            )}
          </div>
        }
        summary={
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryChip
              label={activeTab === "properties" ? "Total proprietati" : "Total atractii"}
              value={activeTab === "properties" ? ordered.length : attractionItems.length}
            />
            <SummaryChip
              label="Publicate"
              value={activeTab === "properties" ? publishedCount : attractionsPublishedCount}
              tone="emerald"
            />
            {activeTab === "properties" && canStaffActions ? (
              <>
                <SummaryChip label="Completate de client" value={clientCompletedCount} tone="blue" />
                <SummaryChip label="Client + nepublicate" value={clientUnpublishedCount} tone="amber" />
              </>
            ) : (
              <SummaryChip
                label="Drafturi"
                value={Math.max(0, attractionItems.length - attractionsPublishedCount)}
                tone="amber"
              />
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <FilterButton active={activeTab === "properties"} onClick={() => setActiveTab("properties")}>
            Proprietati
          </FilterButton>
          <FilterButton active={activeTab === "attractions"} onClick={() => setActiveTab("attractions")}>
            Atractii
          </FilterButton>
        </div>

        {showUpdatedNotice && (
          <AdminNotice onClose={() => setShowUpdatedNotice(false)}>Modificarile au fost salvate cu succes.</AdminNotice>
        )}
        {showCreatedNotice && (
          <AdminNotice onClose={() => setShowCreatedNotice(false)}>
            Anunt nou creat si salvat ca draft{createdId ? ` (id: ${createdId})` : ""}.
          </AdminNotice>
        )}
        {statusMessage && (
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-200">
            {statusMessage}
          </div>
        )}

        {activeTab === "properties" ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <FilterButton active={viewFilter === "all"} onClick={() => setViewFilter("all")}>
                Toate ({ordered.length})
              </FilterButton>
              <FilterButton active={viewFilter === "client_unpublished"} onClick={() => setViewFilter("client_unpublished")}>
                Nepublicate + client ({clientUnpublishedCount})
              </FilterButton>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.45)] dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {canReorder
                    ? "Trage cardurile pentru reordonare si salveaza cand ai terminat."
                    : "Reordonarea este disponibila doar in filtrul Toate."}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => saveOrder(true)}
                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-800"
                    disabled={saving || !isDirty || !canReorder}
                  >
                    Reseteaza ordinea
                  </button>
                  <button
                    type="button"
                    onClick={() => saveOrder(false)}
                    className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                    disabled={saving || !isDirty || !canReorder}
                  >
                    {saving ? "Se salveaza..." : "Salveaza ordinea"}
                  </button>
                </div>
              </div>
            </div>

            {ordered.length === 0 ? (
              <AdminEmptyState
                title="Nu exista inca proprietati"
                description="Catalogul este gol. Poti incepe sa adaugi proprietati reale, una cate una, in ordinea dorita."
                actions={
                  <>
                    {canStaffActions && inviteToken && (
                      <button type="button" onClick={handleStaffAdd} className={primaryActionClassName}>
                        Adauga prima proprietate
                      </button>
                    )}
                    {canStaffActions && inviteToken && (
                      <button type="button" onClick={copyAddPropertyLink} className={secondaryActionClassName}>
                        {copiedAddLink ? "Link copiat" : "Copiaza link client"}
                      </button>
                    )}
                  </>
                }
              />
            ) : visibleItems.length === 0 ? (
              <AdminEmptyState
                title="Nu exista rezultate pentru filtrul curent"
                description="Momentan nu exista proprietati completate de client si inca nepublicate."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visibleItems.map((item, index) => {
                  const isDragging = dragId === item.id;
                  const isOver = overId === item.id && dragId !== item.id;

                  return (
                    <PropertyDraftCard
                      key={item.id}
                      item={item}
                      index={index}
                      canReorder={canReorder}
                      isDragging={isDragging}
                      isOver={isOver}
                      baseUrl={baseUrl}
                      canDelete={canDelete}
                      canStaffActions={canStaffActions}
                      onOpen={() => router.push(`/edit-property/${item.id}`)}
                      onDragStart={(event) => {
                        if (!canReorder) return;
                        const target = event.target as HTMLElement;
                        if (target.closest("button") || target.closest("a")) {
                          event.preventDefault();
                          return;
                        }
                        event.dataTransfer.effectAllowed = "move";
                        setDragId(item.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverId(null);
                      }}
                      onDragOver={(event) => {
                        if (!canReorder) return;
                        event.preventDefault();
                        if (overId !== item.id) setOverId(item.id);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        handleDrop(item.id);
                      }}
                      onStatusChange={(newStatus) => handleStatusChange(item.id, newStatus)}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <FilterButton active={attractionFilter === "all"} onClick={() => setAttractionFilter("all")}>
                Toate ({attractionItems.length})
              </FilterButton>
              <FilterButton active={attractionFilter === "published"} onClick={() => setAttractionFilter("published")}>
                Publicate ({attractionsPublishedCount})
              </FilterButton>
              <FilterButton active={attractionFilter === "draft"} onClick={() => setAttractionFilter("draft")}>
                Draft ({Math.max(0, attractionItems.length - attractionsPublishedCount)})
              </FilterButton>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.45)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-400">
              Poti edita, publica, retrage in draft sau sterge atractiile direct din carduri.
            </div>

            {attractionItems.length === 0 ? (
              <AdminEmptyState
                title="Nu exista inca atractii"
                description="Poti incepe sa adaugi atractii locale pe care sa le folosesti ulterior la sectiunea din apropiere."
                actions={
                  canStaffActions ? (
                    <button type="button" onClick={handleStaffAddAttraction} className={primaryActionClassName}>
                      Adauga prima atractie
                    </button>
                  ) : null
                }
              />
            ) : visibleAttractions.length === 0 ? (
              <AdminEmptyState
                title="Nu exista rezultate pentru filtrul curent"
                description="Nu exista atractii care sa corespunda filtrului selectat."
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
          </>
        )}
      </AdminPageShell>
    </div>
  );
}
