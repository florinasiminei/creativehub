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
  countDraftListings,
  countEmptyDraftSeedListings,
  countExpiringListings,
  countExpiredListings,
  countSubmittedListings,
  filterVisibleListings,
  hasListingOrderChanged,
  moveItem,
  type DraftItem,
  type OwnerClaimItem,
  type PropertyViewFilter,
  type PublicationPeriodItem,
} from "@/lib/admin/draftsDashboard";

type ExtendedPropertyFilter = PropertyViewFilter | "expiring" | "expired";

type Props = {
  listings: DraftItem[];
  publicationPeriods: PublicationPeriodItem[];
  ownerClaims: OwnerClaimItem[];
  role: string;
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

export default function PropertiesSection({
  listings,
  publicationPeriods,
  ownerClaims,
  role,
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
  const [claimItems, setClaimItems] = useState(ownerClaims);
  const [claimActionLoadingId, setClaimActionLoadingId] = useState<string | null>(null);

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

  useEffect(() => {
    setClaimItems(ownerClaims);
  }, [ownerClaims]);

  const initialIds = useMemo(() => listings.map((item) => item.id), [listings]);
  const clientUnpublishedCount = useMemo(() => countClientUnpublishedListings(ordered), [ordered]);
  const submittedCount = useMemo(() => countSubmittedListings(ordered), [ordered]);
  const draftCount = useMemo(() => countDraftListings(ordered), [ordered]);
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

  const copyAddPropertyLink = async () => {
    const copiedOk = await copyTextToClipboard(`${baseUrl}/add-property`);
    if (!copiedOk) return;
    setCopiedAddLink(true);
    window.setTimeout(() => setCopiedAddLink(false), 2000);
  };

  const renewListingPublication = async (listingId: string) => {
    const amountInput = window.prompt(
      "Suma incasata pentru publicarea anuala (RON). Lasa gol daca nu marchezi plata acum.",
      ""
    );
    if (amountInput === null) return;

    const normalizedAmount = amountInput.trim().replace(",", ".");
    const amount = normalizedAmount ? Number(normalizedAmount) : 0;
    if (!Number.isFinite(amount) || amount < 0) {
      onStatusMessage("Introdu o suma valida sau lasa campul gol.");
      return;
    }

    setRenewalActionLoadingId(listingId);
    onStatusMessage(null);

    try {
      const response = await fetch(`/api/backoffice/publication/${listingId}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "RON",
          idempotency_key: crypto.randomUUID(),
        }),
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

  const reviewOwnerClaim = async (
    claim: OwnerClaimItem,
    action: "approve" | "reject"
  ) => {
    if (
      action === "approve" &&
      !window.confirm(
        `Asociezi proprietatea "${claim.listingTitle}" contului ${claim.claimantEmail}?`
      )
    ) {
      return;
    }

    setClaimActionLoadingId(claim.id);
    onStatusMessage(null);

    try {
      const response = await fetch(`/api/backoffice/owner-claims/${claim.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push("/drafts-login?error=1");
        return;
      }
      if (!response.ok) {
        throw new Error(body?.error || "Nu am putut procesa cererea.");
      }

      setClaimItems((current) =>
        current.map((item) =>
          item.id === claim.id
            ? {
                ...item,
                status: action === "approve" ? "approved" : "rejected",
                reviewedAt: new Date().toISOString(),
              }
            : item
        )
      );
      onStatusMessage(
        action === "approve"
          ? "Contul proprietarului a fost asociat."
          : "Cererea de revendicare a fost respinsa."
      );
      router.refresh();
    } catch (error) {
      onStatusMessage(
        error instanceof Error ? error.message : "A aparut o eroare."
      );
    } finally {
      setClaimActionLoadingId(null);
    }
  };

  return (
    <>
      {role === "admin" &&
        claimItems.some((claim) => claim.status === "pending") && (
          <section className="mb-5 rounded-[28px] border border-amber-200 bg-amber-50/70 p-5 shadow-[0_20px_55px_-42px_rgba(146,64,14,0.7)] dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                  Verificare proprietari
                </p>
                <h3 className="mt-1 text-lg font-semibold text-gray-950 dark:text-gray-100">
                  Cereri de revendicare
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Confirma asocierea numai dupa ce ai verificat identitatea solicitantului.
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                {claimItems.filter((claim) => claim.status === "pending").length} in asteptare
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {claimItems
                .filter((claim) => claim.status === "pending")
                .map((claim) => (
                  <article
                    key={claim.id}
                    className="rounded-2xl border border-amber-200/80 bg-white p-4 dark:border-amber-900/50 dark:bg-zinc-900"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-950 dark:text-gray-100">
                          {claim.listingTitle}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {claim.claimantEmail}
                        </div>
                        {claim.message && (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {claim.message}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => reviewOwnerClaim(claim, "reject")}
                          disabled={claimActionLoadingId === claim.id}
                          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-800"
                        >
                          Respinge
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewOwnerClaim(claim, "approve")}
                          disabled={claimActionLoadingId === claim.id}
                          className={primaryActionClassName}
                        >
                          {claimActionLoadingId === claim.id
                            ? "Se proceseaza..."
                            : "Aproba asocierea"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}

      {canStaffActions && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button type="button" onClick={copyAddPropertyLink} className={secondaryActionClassName}>
            {copiedAddLink ? "Link copiat" : "Copiază link proprietar"}
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
      {submittedCount > 0 && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-100">
          {submittedCount} {submittedCount === 1 ? "cazare nouă a fost trimisă" : "cazări noi au fost trimise"}{" "}
          de proprietari și așteaptă verificarea.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterButton active={viewFilter === "all"} onClick={() => setViewFilter("all")}>
          Toate ({ordered.length})
        </FilterButton>
        <FilterButton active={viewFilter === "submitted"} onClick={() => setViewFilter("submitted")}>
          De verificat ({submittedCount})
        </FilterButton>
        <FilterButton active={viewFilter === "client_unpublished"} onClick={() => setViewFilter("client_unpublished")}>
          Nepublicate + client ({clientUnpublishedCount})
        </FilterButton>
        <FilterButton active={viewFilter === "draft"} onClick={() => setViewFilter("draft")}>
          Drafturi ({draftCount})
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
              {canStaffActions && (
                <button type="button" onClick={copyAddPropertyLink} className={secondaryActionClassName}>
                  {copiedAddLink ? "Link copiat" : "Copiază link proprietar"}
                </button>
              )}
            </>
          }
        />
      ) : visibleItems.length === 0 ? (
        <AdminEmptyState
          title="Nu exista rezultate pentru filtrul curent"
          description={
            viewFilter === "draft"
              ? "Momentan nu exista proprietati salvate ca draft."
              : viewFilter === "submitted"
                ? "Momentan nu exista proprietati trimise de proprietari pentru verificare."
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
