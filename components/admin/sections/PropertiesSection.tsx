"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminEmptyState,
  AdminNotice,
  FilterButton,
  PropertyDraftCard,
} from "@/components/admin/DraftDashboardParts";
import { markPageModified, useRefreshOnNavigation } from "@/hooks/useRefreshOnNavigation";
import { copyTextToClipboard } from "@/lib/copyToClipboard";
import {
  countClientUnpublishedListings,
  countDraftSeedListings,
  countEmptyDraftSeedListings,
  countExpiringListings,
  countExpiredListings,
  filterVisibleListings,
  hasListingOrderChanged,
  moveItem,
  type DraftItem,
  type PropertyViewFilter,
  type PublicationPeriodItem,
} from "@/lib/admin/draftsDashboard";

type ExtendedPropertyFilter = PropertyViewFilter | "expiring" | "expired";

type Props = {
  listings: DraftItem[];
  publicationPeriods: PublicationPeriodItem[];
  role: string;
  inviteToken?: string | null;
  siteUrl?: string | null;
  showUpdatedNotice: boolean;
  showCreatedNotice: boolean;
  createdId: string | null;
  onDismissUpdated: () => void;
  onDismissCreated: () => void;
  onStatusMessage: (msg: string | null) => void;
};

const primaryActionClassName =
  "rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800";

const secondaryActionClassName =
  "rounded-full border border-emerald-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50";

function persistInviteToken(inviteToken: string | null | undefined) {
  if (!inviteToken) return;
  try {
    sessionStorage.setItem("invite_token", inviteToken);
  } catch {}
}

export default function PropertiesSection({
  listings,
  publicationPeriods,
  role,
  inviteToken = null,
  siteUrl = null,
  showUpdatedNotice,
  showCreatedNotice,
  createdId,
  onDismissUpdated,
  onDismissCreated,
  onStatusMessage,
}: Props) {
  const router = useRouter();

  const [ordered, setOrdered] = useState(listings);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewFilter, setViewFilter] = useState<ExtendedPropertyFilter>("all");
  const [copiedAddLink, setCopiedAddLink] = useState(false);
  const [renewalActionLoadingId, setRenewalActionLoadingId] = useState<string | null>(null);

  const canStaffActions = role === "staff" || role === "admin";
  const canDelete = canStaffActions;

  const baseUrl = useMemo(() => {
    if (siteUrl) return siteUrl.replace(/\/$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, [siteUrl]);

  useRefreshOnNavigation("drafts");

  useEffect(() => {
    setOrdered(listings);
  }, [listings]);

  const initialIds = useMemo(() => listings.map((item) => item.id), [listings]);
  const clientUnpublishedCount = useMemo(() => countClientUnpublishedListings(ordered), [ordered]);
  const draftSeedCount = useMemo(() => countDraftSeedListings(ordered), [ordered]);
  const emptyDraftSeedCount = useMemo(() => countEmptyDraftSeedListings(ordered), [ordered]);
  const expiringListingsCount = useMemo(() => countExpiringListings(ordered), [ordered]);
  const expiredListingsCount = useMemo(() => countExpiredListings(ordered), [ordered]);

  const visibleItems = useMemo(() => {
    if (viewFilter === "expiring") return ordered.filter((item) => item.publicationStatus === "expiring");
    if (viewFilter === "expired") return ordered.filter((item) => item.publicationStatus === "expired");
    return filterVisibleListings(ordered, viewFilter);
  }, [ordered, viewFilter]);

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
    onStatusMessage(null);

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

      onStatusMessage(reset ? "Ordinea a fost resetata." : "Ordinea a fost salvata.");
      markPageModified();
      router.refresh();
    } catch (error) {
      onStatusMessage(error instanceof Error ? error.message : "A aparut o eroare.");
    } finally {
      setSaving(false);
    }
  };

  const cleanupEmptyDraftSeeds = async () => {
    if (emptyDraftSeedCount === 0) return;
    if (!confirm(`Sigur vrei sa stergi ${emptyDraftSeedCount} drafturi seed goale?`)) return;

    setSaving(true);
    onStatusMessage(null);

    try {
      const response = await fetch("/api/listing-delete-seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyEmpty: true }),
      });

      if (response.status === 401) {
        router.push("/drafts-login?error=1");
        return;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "Nu am putut sterge drafturile seed goale.");
      }

      const deletedIds = Array.isArray(body?.deletedIds) ? body.deletedIds.map(String) : [];
      if (deletedIds.length > 0) {
        setOrdered((prev) => prev.filter((item) => !deletedIds.includes(item.id)));
      }
      onStatusMessage(
        body?.deletedCount > 0
          ? `Au fost sterse ${body.deletedCount} drafturi seed goale.`
          : "Nu exista drafturi seed goale de sters."
      );
      markPageModified();
      router.refresh();
    } catch (error) {
      onStatusMessage(error instanceof Error ? error.message : "A aparut o eroare.");
    } finally {
      setSaving(false);
    }
  };

  const handleStaffAdd = () => {
    persistInviteToken(inviteToken);
    router.push("/add-property");
  };

  const copyAddPropertyLink = async () => {
    if (!inviteToken) return;
    const copiedOk = await copyTextToClipboard(`${baseUrl}/add-property?client=1&token=${inviteToken}`);
    if (!copiedOk) return;
    setCopiedAddLink(true);
    window.setTimeout(() => setCopiedAddLink(false), 2000);
  };

  const renewListingPublication = async (listingId: string) => {
    const amountInput = window.prompt(
      "Suma incasata pentru publicarea anuala (RON). Lasa gol daca nu marchezi plata acum.",
      ""
    );
    setRenewalActionLoadingId(listingId);
    onStatusMessage(null);

    try {
      const response = await fetch(`/api/backoffice/publication/${listingId}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountInput ? Number(amountInput) : null, currency: "RON" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Nu am putut reinnoi publicarea.");
      onStatusMessage("Publicarea a fost reinnoita pentru inca un an.");
      markPageModified();
      router.refresh();
    } catch (error) {
      onStatusMessage(error instanceof Error ? error.message : "A aparut o eroare.");
    } finally {
      setRenewalActionLoadingId(null);
    }
  };

  return (
    <>
      {canStaffActions && inviteToken && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button type="button" onClick={handleStaffAdd} className={primaryActionClassName}>
            Adauga proprietate
          </button>
          <button type="button" onClick={copyAddPropertyLink} className={secondaryActionClassName}>
            {copiedAddLink ? "Link copiat" : "Copiaza link client"}
          </button>
        </div>
      )}

      {canDelete && emptyDraftSeedCount > 0 && (
        <button
          type="button"
          onClick={cleanupEmptyDraftSeeds}
          className={secondaryActionClassName}
          disabled={saving}
        >
          {saving ? "Se sterg..." : `Sterge seed goale (${emptyDraftSeedCount})`}
        </button>
      )}

      {showUpdatedNotice && (
        <AdminNotice onClose={onDismissUpdated}>Modificarile au fost salvate cu succes.</AdminNotice>
      )}
      {showCreatedNotice && (
        <AdminNotice onClose={onDismissCreated}>
          Anunt nou creat si salvat ca draft{createdId ? ` (id: ${createdId})` : ""}.
        </AdminNotice>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterButton active={viewFilter === "all"} onClick={() => setViewFilter("all")}>
          Toate ({ordered.length})
        </FilterButton>
        <FilterButton active={viewFilter === "client_unpublished"} onClick={() => setViewFilter("client_unpublished")}>
          Nepublicate + client ({clientUnpublishedCount})
        </FilterButton>
        <FilterButton active={viewFilter === "draft_seed"} onClick={() => setViewFilter("draft_seed")}>
          Draft seed ({draftSeedCount})
        </FilterButton>
        <FilterButton active={viewFilter === "expiring"} onClick={() => setViewFilter("expiring")}>
          Expira curand ({expiringListingsCount})
        </FilterButton>
        <FilterButton active={viewFilter === "expired"} onClick={() => setViewFilter("expired")}>
          Expirate ({expiredListingsCount})
        </FilterButton>
      </div>

      {canReorder && (
        <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.45)] dark:border-zinc-800 dark:bg-zinc-900 mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Trage cardurile pentru reordonare si salveaza cand ai terminat.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => saveOrder(true)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-800"
                disabled={saving || !isDirty}
              >
                Reseteaza ordinea
              </button>
              <button
                type="button"
                onClick={() => saveOrder(false)}
                className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                disabled={saving || !isDirty}
              >
                {saving ? "Se salveaza..." : "Salveaza ordinea"}
              </button>
            </div>
          </div>
        </div>
      )}

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
          description={
            viewFilter === "draft_seed"
              ? "Momentan nu exista drafturi seed ramase pentru curatare sau verificare."
              : viewFilter === "expiring"
                ? "Momentan nu exista proprietati care expira curand."
                : viewFilter === "expired"
                  ? "Momentan nu exista proprietati expirate."
                  : "Momentan nu exista proprietati completate de client si inca nepublicate."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visibleItems.map((item, index) => {
            const isDragging = dragId === item.id;
            const isOver = overId === item.id && dragId !== item.id;
            const showRenew =
              (item.publicationStatus === "expiring" || item.publicationStatus === "expired") && role === "admin";

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
                onRenew={showRenew ? () => renewListingPublication(item.id) : undefined}
                renewalLoading={renewalActionLoadingId === item.id}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
