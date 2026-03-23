import type { Cazare } from "@/lib/utils";

export type DraftItem = Cazare & {
  status: "publicat" | "inactiv" | "draft";
  isPublished: boolean;
  termsAccepted?: boolean;
  editToken?: string | null;
  isDraftSeed?: boolean;
  isEmptyDraftSeed?: boolean;
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

export type DraftTab = "properties" | "attractions";
export type PropertyViewFilter = "all" | "client_unpublished" | "draft_seed";
export type AttractionViewFilter = "all" | "published" | "draft";

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

export function countClientCompletedListings(items: DraftItem[]) {
  return items.filter((item) => Boolean(item.termsAccepted)).length;
}

export function countClientUnpublishedListings(items: DraftItem[]) {
  return items.filter((item) => Boolean(item.termsAccepted) && !item.isPublished).length;
}

export function countDraftSeedListings(items: DraftItem[]) {
  return items.filter((item) => Boolean(item.isDraftSeed)).length;
}

export function countEmptyDraftSeedListings(items: DraftItem[]) {
  return items.filter((item) => Boolean(item.isEmptyDraftSeed)).length;
}

export function countPublishedAttractions(items: AttractionItem[]) {
  return items.filter((item) => item.isPublished).length;
}

export function filterVisibleListings(items: DraftItem[], filter: PropertyViewFilter) {
  if (filter === "client_unpublished") {
    return items.filter((item) => Boolean(item.termsAccepted) && !item.isPublished);
  }
  if (filter === "draft_seed") {
    return items.filter((item) => Boolean(item.isDraftSeed));
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
