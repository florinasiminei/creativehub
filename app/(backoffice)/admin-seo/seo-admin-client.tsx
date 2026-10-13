"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  SeoFiltersPanel,
  SeoMetricCard,
  SeoPagination,
  SeoResultsTable,
} from "@/components/admin/SeoDashboardParts";
import { copyTextToClipboard } from "@/lib/copyToClipboard";
import {
  SORT_DEFAULT_DIR,
  VIEWS_WINDOW_OPTIONS,
  buildPageKindOptionsByGroup,
  calculateSeoSummary,
  filterAndSortRows,
  getTrafficPointsByWindow,
  getViewsWindowLabel,
  type IndexFilter,
  type PageKindFilter,
  type SeoPageItem,
  type SeoPageStatus,
  type SeoTrafficSeries,
  type SortDir,
  type SortField,
  type ViewsWindow,
} from "@/lib/admin/seoDashboard";

type Props = {
  pages: SeoPageItem[];
  traffic: SeoTrafficSeries;
  embedded?: boolean;
};

const primaryActionClassName =
  "rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800";

const secondaryActionClassName =
  "inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50";

function formatTrafficDate(timestampMs: number, viewsWindow: ViewsWindow, detailed = false) {
  const intraday = viewsWindow === "1h" || viewsWindow === "6h" || viewsWindow === "1d";
  const options: Intl.DateTimeFormatOptions = intraday
    ? detailed
      ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
      : { hour: "2-digit", minute: "2-digit" }
    : detailed
      ? { day: "2-digit", month: "long", year: "numeric" }
      : viewsWindow === "365d"
        ? { month: "short", year: "2-digit" }
        : { day: "2-digit", month: "short" };

  return new Intl.DateTimeFormat("ro-RO", {
    ...options,
    timeZone: "Europe/Bucharest",
  }).format(new Date(timestampMs));
}

function getTrafficGrainLabel(viewsWindow: ViewsWindow) {
  if (viewsWindow === "1h" || viewsWindow === "6h") return "10 minute";
  if (viewsWindow === "1d") return "ora";
  return "zi";
}

function getNiceYAxisMax(maxValue: number) {
  if (maxValue <= 4) return 4;
  const roughStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalizedStep = roughStep / magnitude;
  const niceStep =
    normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;
  return niceStep * magnitude * 4;
}

function SeoTrafficChart({
  traffic,
  viewsWindow,
  onViewsWindowChange,
}: {
  traffic: SeoTrafficSeries;
  viewsWindow: ViewsWindow;
  onViewsWindowChange: (value: ViewsWindow) => void;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = useMemo(
    () => getTrafficPointsByWindow(traffic, viewsWindow),
    [traffic, viewsWindow]
  );
  const maxVisitors = Math.max(0, ...points.map((point) => point.uniqueVisitors));
  const yAxisMax = getNiceYAxisMax(maxVisitors);
  const chartWidth = 1000;
  const chartHeight = 300;
  const plotLeft = 54;
  const plotRight = chartWidth - 18;
  const plotTop = 18;
  const plotBottom = chartHeight - 42;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const coordinates = points.map((point, index) => ({
    ...point,
    x:
      points.length > 1
        ? plotLeft + (index / (points.length - 1)) * plotWidth
        : plotLeft + plotWidth / 2,
    y: plotBottom - (point.uniqueVisitors / yAxisMax) * plotHeight,
  }));
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    coordinates.length > 0
      ? `${linePath} L ${coordinates[coordinates.length - 1].x.toFixed(2)} ${plotBottom} L ${coordinates[0].x.toFixed(2)} ${plotBottom} Z`
      : "";
  const yTicks = Array.from({ length: 5 }, (_, index) => ({
    y: plotTop + (index / 4) * plotHeight,
    value: Math.round(yAxisMax * (1 - index / 4)),
  }));
  const xTickIndices = Array.from(
    new Set(
      Array.from({ length: Math.min(5, points.length) }, (_, index) =>
        Math.round((index / Math.max(1, Math.min(5, points.length) - 1)) * (points.length - 1))
      )
    )
  );
  const activePoint =
    activeIndex === null ? null : coordinates[Math.min(activeIndex, coordinates.length - 1)] || null;

  useEffect(() => {
    setActiveIndex(null);
  }, [viewsWindow]);

  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.45)] dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Vizitatori unici in timp
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Traficul total al site-ului: vizitatori distincti pe fiecare {getTrafficGrainLabel(viewsWindow)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {VIEWS_WINDOW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onViewsWindowChange(option.value)}
              className={`rounded-lg border px-3 py-2 text-xs transition sm:text-sm ${
                viewsWindow === option.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200 dark:hover:bg-zinc-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 min-h-10 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-950 dark:bg-blue-950/30 dark:text-blue-100">
        {activePoint ? (
          <>
            <div className="font-medium">{formatTrafficDate(activePoint.timestampMs, viewsWindow, true)}</div>
            <div className="mt-0.5">
              <span className="text-base font-semibold tabular-nums">
                {activePoint.uniqueVisitors.toLocaleString("ro-RO")}
              </span>{" "}
              vizitatori unici
            </div>
          </>
        ) : (
          <>
            <div className="font-medium">Perioada: {getViewsWindowLabel(viewsWindow)}</div>
            <div className="mt-0.5 text-blue-700 dark:text-blue-300">
              Selecteaza un punct din grafic pentru valoarea exacta.
            </div>
          </>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-auto min-w-[680px] w-full"
          role="img"
          aria-label={`Vizitatori unici pentru traficul total al site-ului in perioada ${getViewsWindowLabel(viewsWindow)}`}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <title>Vizitatori unici in timp</title>
          <desc>Traficul total al site-ului, agregat pe intervalul selectat.</desc>

          {yTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={plotLeft}
                x2={plotRight}
                y1={tick.y}
                y2={tick.y}
                className="stroke-gray-200 dark:stroke-zinc-700"
                strokeWidth="1"
              />
              <text
                x={plotLeft - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-gray-500 text-[11px] dark:fill-gray-400"
              >
                {tick.value}
              </text>
            </g>
          ))}

          {areaPath ? <path d={areaPath} className="fill-blue-100/80 dark:fill-blue-950/50" /> : null}
          {linePath ? (
            <path
              d={linePath}
              fill="none"
              className="stroke-blue-600 dark:stroke-blue-400"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {activePoint ? (
            <>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={plotTop}
                y2={plotBottom}
                className="stroke-blue-300 dark:stroke-blue-700"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5"
                className="fill-white stroke-blue-600 dark:fill-zinc-900 dark:stroke-blue-400"
                strokeWidth="3"
              />
            </>
          ) : null}

          {coordinates.map((point, index) => {
            const targetWidth = plotWidth / Math.max(1, coordinates.length - 1);
            return (
              <rect
                key={point.timestampMs}
                x={Math.max(plotLeft, point.x - targetWidth / 2)}
                y={plotTop}
                width={Math.min(targetWidth, plotRight - Math.max(plotLeft, point.x - targetWidth / 2))}
                height={plotHeight}
                fill="transparent"
                onPointerEnter={() => setActiveIndex(index)}
                onPointerDown={() => setActiveIndex(index)}
              />
            );
          })}

          {xTickIndices.map((index) => {
            const point = coordinates[index];
            if (!point) return null;
            return (
              <text
                key={point.timestampMs}
                x={point.x}
                y={chartHeight - 12}
                textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                className="fill-gray-500 text-[11px] dark:fill-gray-400"
              >
                {formatTrafficDate(point.timestampMs, viewsWindow)}
              </text>
            );
          })}
        </svg>
      </div>

      <ul className="sr-only">
        {points.map((point) => (
          <li key={point.timestampMs}>
            {formatTrafficDate(point.timestampMs, viewsWindow, true)}: {point.uniqueVisitors} vizitatori unici
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SeoAdminClient({ pages, traffic, embedded = false }: Props) {
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
    <div className={embedded ? "" : "flex-1 overflow-y-auto"}>
      <div
        className={
          embedded
            ? "dark:text-gray-100"
            : "mx-auto max-w-[120rem] px-4 py-6 sm:px-6 lg:px-8 dark:text-gray-100"
        }
      >
        <div className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard pagini SEO</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Vizualizezi toate paginile SEO, inclusiv cele care nu apar in meniu, si poti decide rapid ce ramane indexabil sau publicat.</p>
        </div>
        <div className="flex flex-col gap-2">
          {!embedded && (
            <Link href="/drafts" className={secondaryActionClassName}>
              Inapoi la drafturi
            </Link>
          )}
          <button type="button" onClick={applyTopContentSort} className={primaryActionClassName}>
            Sorteaza dupa continut publicat
          </button>
        </div>
      </div>

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

        <SeoTrafficChart
          traffic={traffic}
          viewsWindow={viewsWindow}
          onViewsWindowChange={setViewsWindow}
        />

        <SeoFiltersPanel
          search={search}
          onSearchChange={setSearch}
          indexFilter={indexFilter}
          onIndexFilterChange={setIndexFilter}
          kindFilter={kindFilter}
          onKindFilterChange={setKindFilter}
          pageKindOptionsByGroup={pageKindOptionsByGroup}
        />

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
        </div>
      </div>
    </div>
  );
}
