export type SeoPageStatus = "publicata" | "nepublicata" | "draft";

export type SeoPageItem = {
  id: string;
  slug: string;
  url: string | null;
  openUrl?: string | null;
  pageKind:
    | "home"
    | "cazari_index"
    | "atractii_index"
    | "type"
    | "judet"
    | "type_judet"
    | "regiune"
    | "localitate"
    | "type_region"
    | "type_localitate"
    | "type_facility_judet"
    | "listing"
    | "atractie"
    | "static"
    | "geo_zone";
  title: string;
  status: SeoPageStatus;
  inMenu: boolean;
  indexable: boolean;
  totalListings: number;
  publishedListings: number;
  unpublishedListings: number;
  lastModifiedMs: number | null;
  canTogglePublish: boolean;
  canToggleIndex: boolean;
  pageviews1h: number;
  uniqueVisitors1h: number;
  pageviews6h: number;
  uniqueVisitors6h: number;
  pageviews1d: number;
  uniqueVisitors1d: number;
  pageviews30d: number;
  uniqueVisitors30d: number;
  pageviews90d: number;
  uniqueVisitors90d: number;
  pageviews180d: number;
  uniqueVisitors180d: number;
  pageviews365d: number;
  uniqueVisitors365d: number;
  pageviews7d: number;
  uniqueVisitors7d: number;
  lastSeenViewMs: number | null;
  isInconsistent: boolean;
};

export type SeoTrafficPoint = {
  timestampMs: number;
  uniqueVisitors: number;
};

export type SeoTrafficSeries = {
  tenMinutes: SeoTrafficPoint[];
  hourly: SeoTrafficPoint[];
  daily: SeoTrafficPoint[];
};

export type SortField =
  | "url"
  | "title"
  | "views"
  | "indexable"
  | "listings"
  | "publishedListings"
  | "lastModified"
  | "lastSeenView";

export type SortDir = "asc" | "desc";
export type ViewsWindow = "1h" | "6h" | "1d" | "7d" | "30d" | "90d" | "180d" | "365d";
export type IndexFilter = "all" | "index" | "noindex";
export type PageKindFilter =
  | "all"
  | "home"
  | "cazari_index"
  | "atractii_index"
  | "type"
  | "judet"
  | "type_judet"
  | "regiune"
  | "localitate"
  | "type_region"
  | "type_localitate"
  | "type_facility_judet"
  | "listing"
  | "atractie"
  | "static"
  | "geo_zone";

export type PageKindGroup = "hub" | "geo" | "type" | "detail" | "content";

export const INDEX_FILTER_OPTIONS: Array<{ value: IndexFilter; label: string }> = [
  { value: "all", label: "Indexare: toate" },
  { value: "index", label: "Doar index" },
  { value: "noindex", label: "Doar noindex" },
];

export const PAGE_KIND_GROUP_LABELS: Record<PageKindGroup, string> = {
  hub: "Hub-uri principale",
  geo: "Pagini geografice",
  type: "Pagini pe tipuri",
  detail: "Pagini individuale",
  content: "Alte pagini",
};

export const PAGE_KIND_FILTER_META: Array<{
  value: Exclude<PageKindFilter, "all">;
  label: string;
  group: PageKindGroup;
}> = [
  { value: "home", label: "Homepage", group: "hub" },
  { value: "cazari_index", label: "Hub /cazari", group: "hub" },
  { value: "atractii_index", label: "Hub /atractii", group: "hub" },
  { value: "judet", label: "Pagina judet", group: "geo" },
  { value: "localitate", label: "Pagina localitate", group: "geo" },
  { value: "regiune", label: "Pagina regiune", group: "geo" },
  { value: "geo_zone", label: "Alte pagini geo", group: "geo" },
  { value: "type", label: "Pagina tip cazare", group: "type" },
  { value: "type_judet", label: "Pagina tip + judet", group: "type" },
  { value: "type_localitate", label: "Pagina tip + localitate", group: "type" },
  { value: "type_region", label: "Pagina tip + regiune", group: "type" },
  { value: "type_facility_judet", label: "Pagina tip + facilitate + judet", group: "type" },
  { value: "listing", label: "Pagina individuala cazare", group: "detail" },
  { value: "atractie", label: "Pagina individuala atractie", group: "detail" },
  { value: "static", label: "Pagina statica", group: "content" },
];

export const SORT_DEFAULT_DIR: Record<SortField, SortDir> = {
  url: "asc",
  title: "asc",
  views: "desc",
  indexable: "asc",
  listings: "desc",
  publishedListings: "desc",
  lastModified: "desc",
  lastSeenView: "desc",
};

export const VIEWS_WINDOW_OPTIONS: Array<{ value: ViewsWindow; label: string }> = [
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "1d", label: "1z" },
  { value: "7d", label: "7z" },
  { value: "30d", label: "1 luna" },
  { value: "90d", label: "3 luni" },
  { value: "180d", label: "6 luni" },
  { value: "365d", label: "1 an" },
];

export function formatDate(timestamp: number | null) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ro-RO");
}

export function formatTime(timestamp: number | null) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

export function getViewsByWindow(row: SeoPageItem, viewsWindow: ViewsWindow) {
  if (viewsWindow === "1h") return row.pageviews1h;
  if (viewsWindow === "6h") return row.pageviews6h;
  if (viewsWindow === "1d") return row.pageviews1d;
  if (viewsWindow === "7d") return row.pageviews7d;
  if (viewsWindow === "30d") return row.pageviews30d;
  if (viewsWindow === "90d") return row.pageviews90d;
  if (viewsWindow === "180d") return row.pageviews180d;
  return row.pageviews365d;
}

export function getUniqueViewsByWindow(row: SeoPageItem, viewsWindow: ViewsWindow) {
  if (viewsWindow === "1h") return row.uniqueVisitors1h;
  if (viewsWindow === "6h") return row.uniqueVisitors6h;
  if (viewsWindow === "1d") return row.uniqueVisitors1d;
  if (viewsWindow === "7d") return row.uniqueVisitors7d;
  if (viewsWindow === "30d") return row.uniqueVisitors30d;
  if (viewsWindow === "90d") return row.uniqueVisitors90d;
  if (viewsWindow === "180d") return row.uniqueVisitors180d;
  return row.uniqueVisitors365d;
}

export function getViewsWindowLabel(viewsWindow: ViewsWindow) {
  return VIEWS_WINDOW_OPTIONS.find((option) => option.value === viewsWindow)?.label || viewsWindow;
}

export function getTrafficPointsByWindow(series: SeoTrafficSeries, viewsWindow: ViewsWindow) {
  if (viewsWindow === "1h") return series.tenMinutes.slice(-6);
  if (viewsWindow === "6h") return series.tenMinutes;
  if (viewsWindow === "1d") return series.hourly;
  if (viewsWindow === "7d") return series.daily.slice(-7);
  if (viewsWindow === "30d") return series.daily.slice(-30);
  if (viewsWindow === "90d") return series.daily.slice(-90);
  if (viewsWindow === "180d") return series.daily.slice(-180);
  return series.daily;
}

export function compareRows(a: SeoPageItem, b: SeoPageItem, sortField: SortField, viewsWindow: ViewsWindow) {
  if (sortField === "url") return String(a.url || "").localeCompare(String(b.url || ""), "ro");
  if (sortField === "title") return a.title.localeCompare(b.title, "ro");
  if (sortField === "views") return getViewsByWindow(a, viewsWindow) - getViewsByWindow(b, viewsWindow);
  if (sortField === "indexable") return Number(a.indexable) - Number(b.indexable);
  if (sortField === "listings") return a.totalListings - b.totalListings;
  if (sortField === "publishedListings") return a.publishedListings - b.publishedListings;
  if (sortField === "lastSeenView") return (a.lastSeenViewMs || 0) - (b.lastSeenViewMs || 0);
  return (a.lastModifiedMs || 0) - (b.lastModifiedMs || 0);
}

export function buildPageKindOptionsByGroup(rows: SeoPageItem[]) {
  const counts = new Map<Exclude<PageKindFilter, "all">, number>();
  for (const row of rows) {
    counts.set(row.pageKind, (counts.get(row.pageKind) || 0) + 1);
  }

  const orderedGroups: PageKindGroup[] = ["hub", "geo", "type", "detail", "content"];
  return orderedGroups
    .map((group) => ({
      group,
      label: PAGE_KIND_GROUP_LABELS[group],
      options: PAGE_KIND_FILTER_META.filter((meta) => meta.group === group).map((meta) => ({
        value: meta.value,
        label: `${meta.label} (${counts.get(meta.value) || 0})`,
      })),
    }))
    .filter((group) => group.options.length > 0);
}

export function filterAndSortRows({
  rows,
  search,
  indexFilter,
  kindFilter,
  sortField,
  sortDir,
  viewsWindow,
}: {
  rows: SeoPageItem[];
  search: string;
  indexFilter: IndexFilter;
  kindFilter: PageKindFilter;
  sortField: SortField;
  sortDir: SortDir;
  viewsWindow: ViewsWindow;
}) {
  const query = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (query) {
      const haystack = `${row.title} ${row.slug} ${row.url || ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (indexFilter === "index" && !row.indexable) return false;
    if (indexFilter === "noindex" && row.indexable) return false;
    if (kindFilter !== "all" && row.pageKind !== kindFilter) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const compared = compareRows(a, b, sortField, viewsWindow);
    return sortDir === "asc" ? compared : -compared;
  });

  return filtered;
}

export function calculateSeoSummary(rows: SeoPageItem[], viewsWindow: ViewsWindow) {
  const total = rows.length;
  const index = rows.filter((row) => row.indexable).length;
  const noindex = rows.filter((row) => !row.indexable).length;
  const totalViews = rows.reduce((sum, row) => sum + getViewsByWindow(row, viewsWindow), 0);
  const indexPublishedListings = rows.reduce(
    (sum, row) => (row.indexable ? sum + row.publishedListings : sum),
    0
  );
  const noindexPublishedListings = rows.reduce(
    (sum, row) => (!row.indexable ? sum + row.publishedListings : sum),
    0
  );

  return { total, index, noindex, totalViews, indexPublishedListings, noindexPublishedListings };
}
