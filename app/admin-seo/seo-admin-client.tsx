"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SimpleTopSearchInput from "@/components/SimpleTopSearchInput";

type SeoPageStatus = "publicata" | "nepublicata" | "draft";

type SeoPageItem = {
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
  pageviews30d: number;
  uniqueVisitors30d: number;
  pageviews7d: number;
  uniqueVisitors7d: number;
  isInconsistent: boolean;
};

type Props = {
  pages: SeoPageItem[];
};

type SortField = "url" | "title" | "views" | "indexable" | "listings" | "lastModified";
type SortDir = "asc" | "desc";
type ViewsWindow = "7d" | "30d";
type IndexFilter = "all" | "index" | "noindex";
type PageKindFilter =
  | "all"
  | "home"
  | "cazari_index"
  | "atractii_index"
  | "type"
  | "judet"
  | "regiune"
  | "localitate"
  | "type_region"
  | "type_localitate"
  | "type_facility_judet"
  | "listing"
  | "atractie"
  | "static"
  | "geo_zone";

const INDEX_FILTER_OPTIONS: Array<{ value: IndexFilter; label: string }> = [
  { value: "all", label: "Indexare: toate" },
  { value: "index", label: "Index" },
  { value: "noindex", label: "Noindex" },
];

const PAGE_KIND_FILTER_OPTIONS: Array<{ value: PageKindFilter; label: string }> = [
  { value: "all", label: "Tip pagina: toate" },
  { value: "home", label: "Homepage" },
  { value: "listing", label: "Pagina individuala cazare" },
  { value: "atractii_index", label: "Hub /atractii" },
  { value: "atractie", label: "Pagina individuala atractie" },
  { value: "judet", label: "Pagina judet" },
  { value: "regiune", label: "Pagina regiune" },
  { value: "localitate", label: "Pagina localitate" },
  { value: "type", label: "Pagina tip cazare" },
  { value: "type_region", label: "Pagina tip + regiune" },
  { value: "type_localitate", label: "Pagina tip + localitate" },
  { value: "type_facility_judet", label: "Pagina tip + facilitate + judet" },
  { value: "static", label: "Pagina statica" },
  { value: "cazari_index", label: "Hub /cazari" },
  { value: "geo_zone", label: "Alte pagini geo" },
];

const SORT_DEFAULT_DIR: Record<SortField, SortDir> = {
  url: "asc",
  title: "asc",
  views: "desc",
  indexable: "asc",
  listings: "desc",
  lastModified: "desc",
};

function formatDate(ts: number | null): string {
  if (!ts) return "-";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO");
}

function getViewsByWindow(row: SeoPageItem, viewsWindow: ViewsWindow): number {
  return viewsWindow === "7d" ? row.pageviews7d : row.pageviews30d;
}

function getUniqueViewsByWindow(row: SeoPageItem, viewsWindow: ViewsWindow): number {
  return viewsWindow === "7d" ? row.uniqueVisitors7d : row.uniqueVisitors30d;
}

function compareRows(a: SeoPageItem, b: SeoPageItem, sortField: SortField, viewsWindow: ViewsWindow): number {
  if (sortField === "url") return String(a.url || "").localeCompare(String(b.url || ""), "ro");
  if (sortField === "title") return a.title.localeCompare(b.title, "ro");
  if (sortField === "views") return getViewsByWindow(a, viewsWindow) - getViewsByWindow(b, viewsWindow);
  if (sortField === "indexable") return Number(a.indexable) - Number(b.indexable);
  if (sortField === "listings") return a.totalListings - b.totalListings;
  return (a.lastModifiedMs || 0) - (b.lastModifiedMs || 0);
}

export default function SeoAdminClient({ pages }: Props) {
  const [rows, setRows] = useState(pages);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [indexFilter, setIndexFilter] = useState<IndexFilter>("all");
  const [kindFilter, setKindFilter] = useState<PageKindFilter>("all");
  const [sortField, setSortField] = useState<SortField>("views");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewsWindow, setViewsWindow] = useState<ViewsWindow>("7d");
  const [pageNo, setPageNo] = useState(1);
  const perPage = 25;

  const getViews = (row: SeoPageItem) => getViewsByWindow(row, viewsWindow);
  const getUniqueViews = (row: SeoPageItem) => getUniqueViewsByWindow(row, viewsWindow);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const next = rows.filter((row) => {
      if (q) {
        const haystack = `${row.title} ${row.slug} ${row.url || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (indexFilter === "index" && !row.indexable) return false;
      if (indexFilter === "noindex" && row.indexable) return false;
      if (kindFilter !== "all" && row.pageKind !== kindFilter) return false;
      return true;
    });

    next.sort((a, b) => {
      const cmp = compareRows(a, b, sortField, viewsWindow);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return next;
  }, [rows, search, indexFilter, kindFilter, sortField, sortDir, viewsWindow]);

  const summary = useMemo(() => {
    const total = filteredRows.length;
    const noindex = filteredRows.filter((row) => !row.indexable).length;
    const totalViews30d = filteredRows.reduce((sum, row) => sum + row.pageviews30d, 0);
    const totalViews7d = filteredRows.reduce((sum, row) => sum + row.pageviews7d, 0);
    return { total, noindex, totalViews30d, totalViews7d };
  }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const pagedRows = useMemo(() => {
    const start = (pageNo - 1) * perPage;
    return filteredRows.slice(start, start + perPage);
  }, [filteredRows, pageNo]);

  useEffect(() => {
    if (pageNo > totalPages) setPageNo(totalPages);
    if (pageNo < 1) setPageNo(1);
  }, [pageNo, totalPages]);

  useEffect(() => {
    setPageNo(1);
  }, [search, indexFilter, kindFilter, sortField, sortDir, viewsWindow]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDir(SORT_DEFAULT_DIR[field]);
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return <span className="inline-block w-3 text-center text-gray-400">.</span>;
    return (
      <span className="inline-block w-3 text-center text-emerald-600 dark:text-emerald-300">
        {sortDir === "asc" ? "^" : "v"}
      </span>
    );
  };

  const copyLink = async (url: string | null) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(window.location.origin + url);
    } catch {
      // ignore clipboard errors
    }
  };

  const triggerAction = async (id: string, action: "toggle_publish" | "toggle_noindex") => {
    setLoadingId(id);
    try {
      const response = await fetch("/api/seo-pages-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (response.status === 401) {
        window.location.href = "/drafts-login?error=1";
        return;
      }
      const payload = await response.json();
      if (!response.ok || !payload?.page) return;

      const page = payload.page as Partial<SeoPageItem> & { id: string };
      setRows((prev) =>
        prev.map((row) =>
          row.id === page.id
            ? {
                ...row,
                status: (page.status as SeoPageStatus) || row.status,
                indexable: typeof page.indexable === "boolean" ? page.indexable : row.indexable,
                inMenu: typeof page.inMenu === "boolean" ? page.inMenu : row.inMenu,
                lastModifiedMs: typeof page.lastModifiedMs === "number" ? page.lastModifiedMs : row.lastModifiedMs,
              }
            : row
        )
      );
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="px-2 sm:px-4 lg:px-5 py-6 max-w-[var(--page-max-w)] mx-auto dark:text-gray-100">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300 font-semibold">
          Admin SEO
        </p>
        <h1 className="text-3xl font-semibold mt-2">Dashboard pagini SEO</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Vizualizezi toate paginile SEO, inclusiv cele care nu apar in meniu.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 px-4 py-3">
          <div className="text-xs text-emerald-800/80 dark:text-emerald-200/80">Total pagini</div>
          <div className="text-2xl font-semibold">{summary.total}</div>
        </div>
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 px-4 py-3">
          <div className="text-xs text-emerald-800/80 dark:text-emerald-200/80">Noindex</div>
          <div className="text-2xl font-semibold">{summary.noindex}</div>
        </div>
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 px-4 py-3">
          <div className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
            Pageviews {viewsWindow === "7d" ? "7z" : "30z"}
          </div>
          <div className="text-2xl font-semibold">
            {viewsWindow === "7d" ? summary.totalViews7d : summary.totalViews30d}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <SimpleTopSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cauta dupa URL, slug, titlu..."
          className="md:col-span-2"
        />
        <select
          value={indexFilter}
          onChange={(event) => setIndexFilter(event.target.value as IndexFilter)}
          className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        >
          {INDEX_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={kindFilter}
          onChange={(event) => setKindFilter(event.target.value as PageKindFilter)}
          className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        >
          {PAGE_KIND_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap justify-end items-center gap-2 mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setViewsWindow("7d")}
            className={`px-3 py-2 text-xs sm:text-sm ${viewsWindow === "7d" ? "bg-emerald-600 text-white" : "bg-white dark:bg-zinc-900"}`}
          >
            7z
          </button>
          <button
            type="button"
            onClick={() => setViewsWindow("30d")}
            className={`px-3 py-2 text-xs sm:text-sm ${viewsWindow === "30d" ? "bg-emerald-600 text-white" : "bg-white dark:bg-zinc-900"}`}
          >
            30z
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <table className="w-full min-w-[980px] table-fixed text-xs sm:text-sm">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-zinc-800/50 text-left">
            <tr>
              <th className="px-2 py-2 font-semibold">
                <button type="button" onClick={() => toggleSort("url")} className="inline-flex items-center gap-1 hover:underline whitespace-nowrap">
                  URL / Slug {sortIndicator("url")}
                </button>
              </th>
              <th className="px-2 py-2 font-semibold">
                <button type="button" onClick={() => toggleSort("title")} className="inline-flex items-center gap-1 hover:underline whitespace-nowrap">
                  Titlu {sortIndicator("title")}
                </button>
              </th>
              <th className="px-2 py-2 font-semibold">
                <button type="button" onClick={() => toggleSort("views")} className="inline-flex items-center gap-1 hover:underline whitespace-nowrap">
                  Views {viewsWindow === "7d" ? "7z" : "30z"} {sortIndicator("views")}
                </button>
              </th>
              <th className="px-2 py-2 font-semibold">
                <button type="button" onClick={() => toggleSort("indexable")} className="inline-flex items-center gap-1 hover:underline whitespace-nowrap">
                  Indexare {sortIndicator("indexable")}
                </button>
              </th>
              <th className="px-2 py-2 font-semibold">
                <button type="button" onClick={() => toggleSort("listings")} className="inline-flex items-center gap-1 hover:underline whitespace-nowrap">
                  Cazari {sortIndicator("listings")}
                </button>
              </th>
              <th className="px-2 py-2 font-semibold">
                <button type="button" onClick={() => toggleSort("lastModified")} className="inline-flex items-center gap-1 hover:underline whitespace-nowrap">
                  Ultima modificare {sortIndicator("lastModified")}
                </button>
              </th>
              <th className="px-2 py-2 font-semibold">Actiuni</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => {
              const rowLoading = loadingId === row.id;
              return (
                <tr key={row.id} className="border-t border-gray-100 dark:border-zinc-800">
                  <td className="px-2 py-2 align-top">
                    <div className="font-medium truncate">{row.url || "-"}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{row.slug}</div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <span className="line-clamp-2">{row.title}</span>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <div>{getViews(row)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Unici: {getUniqueViews(row)}</div>
                  </td>
                  <td className="px-2 py-2 align-top">{row.indexable ? "Index" : "Noindex"}</td>
                  <td className="px-2 py-2 align-top">
                    <div>Total: {row.totalListings}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Publicate: {row.publishedListings} | Nepublicate: {row.unpublishedListings}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top whitespace-nowrap">{formatDate(row.lastModifiedMs)}</td>
                  <td className="px-2 py-2 align-top">
                    <div className="flex flex-wrap gap-1">
                      {row.openUrl || row.url ? (
                        <Link
                          href={row.openUrl || row.url || "#"}
                          target="_blank"
                          className="px-2 py-1 rounded-md border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800"
                        >
                          Deschide
                        </Link>
                      ) : (
                        <span className="px-2 py-1 rounded-md border border-gray-200 dark:border-zinc-700 text-gray-400">
                          Deschide
                        </span>
                      )}
                      {row.canTogglePublish && (
                        <button
                          type="button"
                          disabled={rowLoading}
                          onClick={() => triggerAction(row.id, "toggle_publish")}
                          className="px-2 py-1 rounded-md border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-60"
                        >
                          {row.status === "publicata" ? "Depublica" : "Publica"}
                        </button>
                      )}
                      {row.canToggleIndex && (
                        <button
                          type="button"
                          disabled={rowLoading}
                          onClick={() => triggerAction(row.id, "toggle_noindex")}
                          className="px-2 py-1 rounded-md border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-60"
                        >
                          {row.indexable ? "Set noindex" : "Set index"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyLink(row.url)}
                        className="px-2 py-1 rounded-md border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        Copiaza link
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                  Nicio pagina SEO care sa corespunda filtrelor curente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
        <span>
          Pagina {pageNo} / {totalPages} | {filteredRows.length} rezultate
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPageNo((p) => Math.max(1, p - 1))}
            disabled={pageNo === 1}
            className="px-2 py-1 rounded border border-gray-200 dark:border-zinc-700 disabled:opacity-50"
          >
            Inapoi
          </button>
          <button
            type="button"
            onClick={() => setPageNo((p) => Math.min(totalPages, p + 1))}
            disabled={pageNo === totalPages}
            className="px-2 py-1 rounded border border-gray-200 dark:border-zinc-700 disabled:opacity-50"
          >
            Inainte
          </button>
        </div>
      </div>
    </div>
  );
}

