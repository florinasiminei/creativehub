import type { Cazare } from "@/lib/utils";

export type DraftItem = Cazare & {
  status: "publicat" | "inactiv" | "draft";
  isPublished: boolean;
  termsAccepted?: boolean;
  editToken?: string | null;
  isDraftSeed?: boolean;
  isEmptyDraftSeed?: boolean;
  publishedAt?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
  createdByActor?: string | null;
  publicationExpiresAt?: string | null;
  renewalDueAt?: string | null;
  publicationStatus?:
    | "draft"
    | "submitted"
    | "needs_changes"
    | "rejected"
    | "active"
    | "expiring"
    | "expired"
    | "suspended"
    | null;
  leadId?: string | null;
  leadStatus?: LeadStatus | null;
};

export type AttractionItem = {
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

export type LeadStatus =
  | "nou"
  | "contactat"
  | "interesat"
  | "cerere_deplasare"
  | "convertit"
  | "neinteresat"
  | "inactiv";

export type LeadItem = {
  id: string;
  listingId: string | null;
  propertyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  judet: string | null;
  city: string | null;
  sat: string | null;
  source: string | null;
  status: LeadStatus;
  followUpAt: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PublicationPeriodItem = {
  id: string;
  listingId: string;
  startsAt: string;
  endsAt: string;
  amount: number | null;
  currency: string | null;
  status: "pending" | "active" | "expired" | "cancelled";
  notes: string | null;
  createdAt: string | null;
};

export type OwnerClaimItem = {
  id: string;
  listingId: string;
  listingTitle: string;
  claimantEmail: string;
  message: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string | null;
  reviewedAt: string | null;
};

export type BackofficeSection =
  | "catalog"
  | "leads-calendar"
  | "settings";

export type PropertyViewFilter = "all" | "submitted" | "client_unpublished" | "draft";
export type AttractionViewFilter = "all" | "published" | "draft";
export type RenewalViewFilter = "all" | "active" | "expiring" | "expired";

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function countPublishedListings(items: DraftItem[]) {
  return items.filter((item) => item.isPublished).length;
}

export function countExpiredListings(items: DraftItem[]) {
  const now = Date.now();
  return items.filter((item) => {
    if (item.publicationStatus === "expired") return true;
    if (!item.publicationExpiresAt) return false;
    return new Date(item.publicationExpiresAt).getTime() < now;
  }).length;
}

export function countExpiringListings(items: DraftItem[], days = 30) {
  const now = Date.now();
  const limit = now + days * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    if (!item.publicationExpiresAt) return false;
    const expiresAt = new Date(item.publicationExpiresAt).getTime();
    return expiresAt >= now && expiresAt <= limit;
  }).length;
}

export function countClientCompletedListings(items: DraftItem[]) {
  return items.filter((item) => Boolean(item.termsAccepted)).length;
}

export function countClientUnpublishedListings(items: DraftItem[]) {
  return items.filter((item) => Boolean(item.termsAccepted) && !item.isPublished).length;
}

export function countSubmittedListings(items: DraftItem[]) {
  return items.filter((item) => item.publicationStatus === "submitted").length;
}

export function countDraftListings(items: DraftItem[]) {
  return items.filter(
    (item) =>
      item.publicationStatus === "draft" ||
      (!item.publicationStatus && item.status === "draft")
  ).length;
}

export function countEmptyDraftSeedListings(items: DraftItem[]) {
  return items.filter((item) => Boolean(item.isEmptyDraftSeed)).length;
}

export function countPublishedAttractions(items: AttractionItem[]) {
  return items.filter((item) => item.isPublished).length;
}

export function filterVisibleListings(items: DraftItem[], filter: PropertyViewFilter) {
  if (filter === "submitted") {
    return items.filter((item) => item.publicationStatus === "submitted");
  }
  if (filter === "client_unpublished") {
    return items.filter((item) => Boolean(item.termsAccepted) && !item.isPublished);
  }
  if (filter === "draft") {
    return items.filter(
      (item) =>
        item.publicationStatus === "draft" ||
        (!item.publicationStatus && item.status === "draft")
    );
  }

  return items;
}

export function filterVisibleAttractions(items: AttractionItem[], filter: AttractionViewFilter) {
  if (filter === "published") return items.filter((item) => item.isPublished);
  if (filter === "draft") return items.filter((item) => !item.isPublished);
  return items;
}

export function hasListingOrderChanged(items: DraftItem[], initialIds: string[]) {
  if (items.length !== initialIds.length) return true;
  return items.some((item, index) => item.id !== initialIds[index]);
}

export function markExpiringListings(items: DraftItem[], days = 30): DraftItem[] {
  const now = Date.now();
  const limit = now + days * 24 * 60 * 60 * 1000;
  return items.map((item) => {
    if (item.publicationStatus && item.publicationStatus !== "active") return item;
    if (!item.publicationExpiresAt) return item;
    const expiresAt = new Date(item.publicationExpiresAt).getTime();
    if (expiresAt < now) {
      return { ...item, publicationStatus: "expired" };
    }
    if (expiresAt <= limit) {
      return { ...item, publicationStatus: "expiring" };
    }
    return item;
  });
}
