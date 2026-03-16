import type { ReactNode } from "react";
import Link from "next/link";
import SimpleTopSearchInput from "@/components/SimpleTopSearchInput";
import {
  INDEX_FILTER_OPTIONS,
  VIEWS_WINDOW_OPTIONS,
  formatDate,
  formatTime,
  getUniqueViewsByWindow,
  getViewsByWindow,
  getViewsWindowLabel,
  type IndexFilter,
  type PageKindFilter,
  type SeoPageItem,
  type SortDir,
  type SortField,
  type ViewsWindow,
} from "@/lib/admin/seoDashboard";

export function SeoMetricCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string | number;
  meta?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-emerald-950">{value}</div>
      {meta ? <div className="mt-1 text-xs text-gray-600">{meta}</div> : null}
    </div>
  );
}

export function SeoSortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDir;
}) {
  if (!active) {
    return <span className="inline-flex w-4 items-center justify-center text-[11px] text-gray-300 dark:text-zinc-600">↕</span>;
  }

  return (
    <span className="inline-flex w-4 items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );
}

export function SeoFiltersPanel({
  search,
  onSearchChange,
  indexFilter,
  onIndexFilterChange,
  kindFilter,
  onKindFilterChange,
  pageKindOptionsByGroup,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  indexFilter: IndexFilter;
  onIndexFilterChange: (value: IndexFilter) => void;
  kindFilter: PageKindFilter;
  onKindFilterChange: (value: PageKindFilter) => void;
  pageKindOptionsByGroup: Array<{
    group: string;
    label: string;
    options: Array<{ value: Exclude<PageKindFilter, "all">; label: string }>;
  }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.45)] dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-4">
      <SimpleTopSearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Cauta dupa URL, slug sau titlu..."
        className="md:col-span-2"
      />
      <select
        value={indexFilter}
        onChange={(event) => onIndexFilterChange(event.target.value as IndexFilter)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {INDEX_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={kindFilter}
        onChange={(event) => onKindFilterChange(event.target.value as PageKindFilter)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="all">Tip pagina: toate</option>
        {pageKindOptionsByGroup.map((group) => (
          <optgroup key={group.group} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

export function ViewsWindowSelector({
  viewsWindow,
  onChange,
}: {
  viewsWindow: ViewsWindow;
  onChange: (value: ViewsWindow) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-700">
        {VIEWS_WINDOW_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-3 py-2 text-xs sm:text-sm ${
              viewsWindow === option.value ? "bg-emerald-600 text-white" : "bg-white dark:bg-zinc-900"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SeoRowActions({
  row,
  rowLoading,
  onTriggerAction,
  onCopyLink,
}: {
  row: SeoPageItem;
  rowLoading: boolean;
  onTriggerAction: (id: string, action: "toggle_publish" | "toggle_noindex") => void;
  onCopyLink: (url: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {row.openUrl || row.url ? (
        <Link
          href={row.openUrl || row.url || "#"}
          target="_blank"
          className="rounded-md border border-gray-200 px-2 py-1 hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Deschide
        </Link>
      ) : (
        <span className="rounded-md border border-gray-200 px-2 py-1 text-gray-400 dark:border-zinc-700">Deschide</span>
      )}

      {row.canTogglePublish && (
        <button
          type="button"
          disabled={rowLoading}
          onClick={() => onTriggerAction(row.id, "toggle_publish")}
          className="rounded-md border border-gray-200 px-2 py-1 hover:bg-gray-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {row.status === "publicata" ? "Depublica" : "Publica"}
        </button>
      )}

      {row.canToggleIndex && (
        <button
          type="button"
          disabled={rowLoading}
          onClick={() => onTriggerAction(row.id, "toggle_noindex")}
          className="rounded-md border border-gray-200 px-2 py-1 hover:bg-gray-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {row.indexable ? "Set noindex" : "Set index"}
        </button>
      )}

      <button
        type="button"
        onClick={() => onCopyLink(row.url)}
        className="rounded-md border border-gray-200 px-2 py-1 hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Copiaza link
      </button>
    </div>
  );
}

export function SeoResultsTable({
  rows,
  loadingId,
  sortField,
  sortDir,
  viewsWindow,
  onToggleSort,
  onTriggerAction,
  onCopyLink,
}: {
  rows: SeoPageItem[];
  loadingId: string | null;
  sortField: SortField;
  sortDir: SortDir;
  viewsWindow: ViewsWindow;
  onToggleSort: (field: SortField) => void;
  onTriggerAction: (id: string, action: "toggle_publish" | "toggle_noindex") => void;
  onCopyLink: (url: string | null) => void;
}) {
  const renderIndicator = (field: SortField) => (
    <SeoSortIndicator active={sortField === field} direction={sortDir} />
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full min-w-[1080px] table-fixed text-xs sm:text-sm">
        <colgroup>
          <col className="w-[15%]" />
          <col className="w-[15%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[16%]" />
        </colgroup>
        <thead className="bg-gray-50 text-left dark:bg-zinc-800/50">
          <tr>
            <th className="px-2 py-2 font-semibold">
              <button type="button" onClick={() => onToggleSort("url")} className="inline-flex items-center gap-1 whitespace-nowrap hover:underline">
                URL / Slug {renderIndicator("url")}
              </button>
            </th>
            <th className="px-2 py-2 font-semibold">
              <button type="button" onClick={() => onToggleSort("title")} className="inline-flex items-center gap-1 whitespace-nowrap hover:underline">
                Titlu {renderIndicator("title")}
              </button>
            </th>
            <th className="px-2 py-2 font-semibold">
              <button type="button" onClick={() => onToggleSort("views")} className="inline-flex items-center gap-1 whitespace-nowrap hover:underline">
                Views {getViewsWindowLabel(viewsWindow)} {renderIndicator("views")}
              </button>
            </th>
            <th className="px-2 py-2 text-center font-semibold">
              <button
                type="button"
                onClick={() => onToggleSort("publishedListings")}
                className="inline-flex items-center gap-1 whitespace-nowrap hover:underline"
              >
                Cazari publicate {renderIndicator("publishedListings")}
              </button>
            </th>
            <th className="px-2 py-2 text-center font-semibold">
              <button type="button" onClick={() => onToggleSort("listings")} className="inline-flex items-center gap-1 whitespace-nowrap hover:underline">
                Total cazari {renderIndicator("listings")}
              </button>
            </th>
            <th className="px-2 py-2 font-semibold">
              <button type="button" onClick={() => onToggleSort("lastModified")} className="inline-flex items-center gap-1 whitespace-nowrap hover:underline">
                Ultima modificare {renderIndicator("lastModified")}
              </button>
            </th>
            <th className="px-2 py-2 font-semibold">
              <button type="button" onClick={() => onToggleSort("lastSeenView")} className="inline-flex items-center gap-1 whitespace-nowrap hover:underline">
                Ultimul view {renderIndicator("lastSeenView")}
              </button>
            </th>
            <th className="px-2 py-2 font-semibold">Actiuni</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowLoading = loadingId === row.id;

            return (
              <tr key={row.id} className="border-t border-gray-100 dark:border-zinc-800">
                <td className="px-2 py-2 align-top">
                  <div className="truncate font-medium" title={row.url || "-"}>
                    {row.url || "-"}
                  </div>
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400" title={row.slug}>
                    {row.slug}
                  </div>
                </td>
                <td className="px-2 py-2 align-top">
                  <span className="block truncate" title={row.title}>
                    {row.title}
                  </span>
                  {row.isInconsistent ? (
                    <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                      Inconsistent
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-2 align-top">
                  <div>{getViewsByWindow(row, viewsWindow)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Unici: {getUniqueViewsByWindow(row, viewsWindow)}
                  </div>
                </td>
                <td className="px-2 py-2 align-top text-center font-medium tabular-nums">
                  <div>{row.publishedListings}</div>
                </td>
                <td className="px-2 py-2 align-top text-center font-medium tabular-nums">
                  <div>{row.totalListings}</div>
                </td>
                <td className="whitespace-nowrap px-2 py-2 align-top">
                  <div>{formatDate(row.lastModifiedMs)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{formatTime(row.lastModifiedMs)}</div>
                </td>
                <td className="whitespace-nowrap px-2 py-2 align-top">
                  <div>{formatDate(row.lastSeenViewMs)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{formatTime(row.lastSeenViewMs)}</div>
                </td>
                <td className="px-2 py-2 align-top">
                  <SeoRowActions
                    row={row}
                    rowLoading={rowLoading}
                    onTriggerAction={onTriggerAction}
                    onCopyLink={onCopyLink}
                  />
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                Nicio pagina SEO nu corespunde filtrelor curente.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SeoPagination({
  pageNo,
  totalPages,
  totalResults,
  onPrevious,
  onNext,
}: {
  pageNo: number;
  totalPages: number;
  totalResults: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
      <span>
        Pagina {pageNo} / {totalPages} | {totalResults} rezultate
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={pageNo === 1}
          className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-zinc-700"
        >
          Inapoi
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={pageNo === totalPages}
          className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-zinc-700"
        >
          Inainte
        </button>
      </div>
    </div>
  );
}
