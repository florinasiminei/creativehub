"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminPageShell from "@/components/admin/AdminPageShell";
import {
  SeoFiltersPanel,
  SeoMetricCard,
  SeoPagination,
  SeoResultsTable,
  ViewsWindowSelector,
} from "@/components/admin/SeoDashboardParts";
import { copyTextToClipboard } from "@/lib/copyToClipboard";
import {
  SORT_DEFAULT_DIR,
  buildPageKindOptionsByGroup,
  calculateSeoSummary,
  filterAndSortRows,
  getViewsWindowLabel,
  type IndexFilter,
  type PageKindFilter,
  type SeoPageItem,
  type SeoPageStatus,
  type SortDir,
  type SortField,
  type ViewsWindow,
} from "@/lib/admin/seoDashboard";

type Props = {
  pages: SeoPageItem[];
};

const primaryActionClassName =
  "rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800";

const secondaryActionClassName =
  "inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50";

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

  const pageKindOptionsByGroup = useMemo(() => buildPageKindOptionsByGroup(rows), [rows]);

  const filteredRows = useMemo(
    () =>
      filterAndSortRows({
        rows,
        search,
        indexFilter,
        kindFilter,
        sortField,
        sortDir,
        viewsWindow,
      }),
    [rows, search, indexFilter, kindFilter, sortField, sortDir, viewsWindow]
  );

  const summary = useMemo(() => calculateSeoSummary(filteredRows, viewsWindow), [filteredRows, viewsWindow]);

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

  const applyTopContentSort = () => {
    setSortField("publishedListings");
    setSortDir("desc");
  };

  const copyLink = async (url: string | null) => {
    if (!url || typeof window === "undefined") return;
    await copyTextToClipboard(window.location.origin + url);
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
    <div className="mx-auto max-w-[var(--page-max-w)] px-2 py-6 dark:text-gray-100 sm:px-4 lg:px-5">
      <AdminPageShell
        eyebrow="Admin SEO"
        title="Dashboard pagini SEO"
        description="Vizualizezi toate paginile SEO, inclusiv cele care nu apar in meniu, si poti decide rapid ce ramane indexabil sau publicat."
        actions={
          <div className="flex flex-col gap-2">
            <Link href="/drafts" className={secondaryActionClassName}>
              Inapoi la drafturi
            </Link>
            <button type="button" onClick={applyTopContentSort} className={primaryActionClassName}>
              Sorteaza dupa continut publicat
            </button>
          </div>
        }
        summary={
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SeoMetricCard label="Total pagini" value={summary.total} />
            <SeoMetricCard
              label="Index"
              value={summary.index}
              meta={
                <>
                  <div>{summary.total > 0 ? `${Math.round((summary.index / summary.total) * 100)}%` : "0%"}</div>
                  <div>Cazari publicate: {summary.indexPublishedListings}</div>
                </>
              }
            />
            <SeoMetricCard
              label="Noindex"
              value={summary.noindex}
              meta={`Cazari publicate: ${summary.noindexPublishedListings}`}
            />
            <SeoMetricCard label={`Pageviews ${getViewsWindowLabel(viewsWindow)}`} value={summary.totalViews} />
          </div>
        }
      >
        <SeoFiltersPanel
          search={search}
          onSearchChange={setSearch}
          indexFilter={indexFilter}
          onIndexFilterChange={setIndexFilter}
          kindFilter={kindFilter}
          onKindFilterChange={setKindFilter}
          pageKindOptionsByGroup={pageKindOptionsByGroup}
        />

        <ViewsWindowSelector viewsWindow={viewsWindow} onChange={setViewsWindow} />

        <SeoResultsTable
          rows={pagedRows}
          loadingId={loadingId}
          sortField={sortField}
          sortDir={sortDir}
          viewsWindow={viewsWindow}
          onToggleSort={toggleSort}
          onTriggerAction={triggerAction}
          onCopyLink={copyLink}
        />

        <SeoPagination
          pageNo={pageNo}
          totalPages={totalPages}
          totalResults={filteredRows.length}
          onPrevious={() => setPageNo((prev) => Math.max(1, prev - 1))}
          onNext={() => setPageNo((prev) => Math.min(totalPages, prev + 1))}
        />
      </AdminPageShell>
    </div>
  );
}
