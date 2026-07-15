"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CalendarDeploymentsClient from "@/app/(backoffice)/drafts/calendar-deployments/calendar-deployments-client";
import { AdminEmptyState } from "@/components/admin/DraftDashboardParts";
import LeadCreateModal from "@/components/admin/leads/LeadCreateModal";
import { markPageModified } from "@/hooks/useRefreshOnNavigation";
import { type LeadItem, type LeadStatus } from "@/lib/admin/draftsDashboard";

type Props = {
  leads: LeadItem[];
  role: string;
  onStatusMessage: (msg: string | null) => void;
  onGoToCalendar?: () => void;
};

type LeadSort = "newest" | "oldest" | "property" | "follow_up";
type LeadAction = "status" | "listing";

const LEAD_STATUSES: LeadStatus[] = [
  "nou",
  "contactat",
  "interesat",
  "cerere_deplasare",
  "convertit",
  "neinteresat",
  "inactiv",
];

const OPEN_LEAD_STATUSES: LeadStatus[] = ["nou", "contactat", "interesat", "cerere_deplasare"];

const leadStatusMeta: Record<LeadStatus, { label: string; className: string; dotClassName: string }> = {
  nou: {
    label: "Nou",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200",
    dotClassName: "bg-blue-500",
  },
  contactat: {
    label: "Contactat",
    className: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-200",
    dotClassName: "bg-violet-500",
  },
  interesat: {
    label: "Interesat",
    className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
    dotClassName: "bg-amber-500",
  },
  cerere_deplasare: {
    label: "Cerere deplasare",
    className: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-200",
    dotClassName: "bg-orange-500",
  },
  convertit: {
    label: "Convertit",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
    dotClassName: "bg-emerald-500",
  },
  neinteresat: {
    label: "Neinteresat",
    className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200",
    dotClassName: "bg-rose-500",
  },
  inactiv: {
    label: "Inactiv",
    className: "border-gray-200 bg-gray-50 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-300",
    dotClassName: "bg-gray-400",
  },
};

const primaryActionClassName =
  "rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60";

const secondaryActionClassName =
  "rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/30";

const controlClassName =
  "rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-200";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ro-RO", { year: "numeric", month: "short", day: "2-digit" });
}

function getSourceLabel(source?: string | null) {
  if (!source) return "Sursă necunoscută";
  const labels: Record<string, string> = {
    backoffice: "Backoffice",
    cold_call: "Cold calling",
    calendar: "Calendar",
    website: "Website",
  };
  return labels[source] || source.replaceAll("_", " ");
}

function getLocation(lead: LeadItem) {
  return [lead.sat, lead.city, lead.judet].filter(Boolean).join(", ") || "Locație nespecificată";
}

function matchesSearch(lead: LeadItem, query: string) {
  if (!query) return true;
  const searchable = [
    lead.propertyName,
    lead.contactName,
    lead.phone,
    lead.email,
    lead.judet,
    lead.city,
    lead.sat,
    lead.source,
    lead.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ro-RO");
  return searchable.includes(query);
}

function sortLeads(items: LeadItem[], sort: LeadSort) {
  return [...items].sort((first, second) => {
    if (sort === "property") return first.propertyName.localeCompare(second.propertyName, "ro");
    if (sort === "follow_up") {
      const firstDate = first.followUpAt ? new Date(first.followUpAt).getTime() : Number.MAX_SAFE_INTEGER;
      const secondDate = second.followUpAt ? new Date(second.followUpAt).getTime() : Number.MAX_SAFE_INTEGER;
      return firstDate - secondDate;
    }
    const firstDate = first.createdAt ? new Date(first.createdAt).getTime() : 0;
    const secondDate = second.createdAt ? new Date(second.createdAt).getTime() : 0;
    return sort === "oldest" ? firstDate - secondDate : secondDate - firstDate;
  });
}

export default function LeadsCalendarSection({ leads, role, onStatusMessage, onGoToCalendar }: Props) {
  const router = useRouter();
  const canManageLeads = role === "admin" || role === "staff";

  const [leadItems, setLeadItems] = useState(leads);
  const [leadFilter, setLeadFilter] = useState<"all" | LeadStatus>("all");
  const [leadSort, setLeadSort] = useState<LeadSort>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [leadActions, setLeadActions] = useState<Record<string, LeadAction>>({});
  const [internalTab, setInternalTab] = useState<"leads" | "calendar">("leads");
  const [createLeadOpen, setCreateLeadOpen] = useState(false);

  useEffect(() => {
    setLeadItems(leads);
  }, [leads]);

  const statusCounts = useMemo(
    () =>
      LEAD_STATUSES.reduce<Record<LeadStatus, number>>(
        (counts, status) => ({ ...counts, [status]: leadItems.filter((lead) => lead.status === status).length }),
        {
          nou: 0,
          contactat: 0,
          interesat: 0,
          cerere_deplasare: 0,
          convertit: 0,
          neinteresat: 0,
          inactiv: 0,
        }
      ),
    [leadItems]
  );

  const openLeadsCount = useMemo(
    () => leadItems.filter((lead) => OPEN_LEAD_STATUSES.includes(lead.status)).length,
    [leadItems]
  );
  const followUpCount = useMemo(() => leadItems.filter((lead) => Boolean(lead.followUpAt)).length, [leadItems]);
  const convertedCount = statusCounts.convertit;

  const visibleLeads = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ro-RO");
    const filtered = leadItems.filter(
      (lead) =>
        (leadFilter === "all" || lead.status === leadFilter) && matchesSearch(lead, normalizedQuery)
    );
    return sortLeads(filtered, leadSort);
  }, [leadFilter, leadItems, leadSort, searchQuery]);

  const setAction = (leadId: string, action: LeadAction | null) => {
    setLeadActions((previous) => {
      if (action) return { ...previous, [leadId]: action };
      const next = { ...previous };
      delete next[leadId];
      return next;
    });
  };

  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    const current = leadItems.find((lead) => lead.id === leadId);
    if (!current || current.status === status) return;

    setLeadItems((previous) =>
      previous.map((lead) => (lead.id === leadId ? { ...lead, status } : lead))
    );
    setAction(leadId, "status");
    onStatusMessage(null);

    try {
      const response = await fetch(`/api/backoffice/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Nu am putut actualiza lead-ul.");
      markPageModified();
    } catch (error) {
      setLeadItems((previous) =>
        previous.map((lead) => (lead.id === leadId ? current : lead))
      );
      onStatusMessage(error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setAction(leadId, null);
    }
  };

  const createListingFromLead = async (leadId: string) => {
    setAction(leadId, "listing");
    onStatusMessage(null);

    try {
      const response = await fetch(`/api/backoffice/leads/${leadId}/create-listing`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Nu am putut crea draftul din lead.");
      onStatusMessage("Draftul de proprietate a fost creat și legat de lead.");
      markPageModified();
      router.refresh();
    } catch (error) {
      onStatusMessage(error instanceof Error ? error.message : "A apărut o eroare.");
    } finally {
      setAction(leadId, null);
    }
  };

  const switchToCalendar = () => {
    setInternalTab("calendar");
    onGoToCalendar?.();
  };

  const resetFilters = () => {
    setSearchQuery("");
    setLeadFilter("all");
    setLeadSort("newest");
  };

  return (
    <>
      <div className="mb-5 flex w-fit rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <TabButton active={internalTab === "leads"} onClick={() => setInternalTab("leads")}>
          Leads
        </TabButton>
        <TabButton active={internalTab === "calendar"} onClick={switchToCalendar}>
          Calendar
        </TabButton>
      </div>

      {internalTab === "leads" && (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 text-white shadow-[0_24px_70px_-42px_rgba(6,78,59,0.9)] dark:border-emerald-900">
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  Pipeline comercial
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Leads într-un singur loc</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/80">
                  Urmărește contactele, programările și conversiile fără să pierzi următorul pas.
                </p>
              </div>
              {canManageLeads && (
                <button
                  type="button"
                  onClick={() => setCreateLeadOpen(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-900 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  <span aria-hidden="true" className="text-lg leading-none">+</span>
                  Lead nou
                </button>
              )}
            </div>

            <div className="grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Total lead-uri" value={leadItems.length} />
              <Metric label="În lucru" value={openLeadsCount} />
              <Metric label="Cu follow-up" value={followUpCount} />
              <Metric label="Convertite" value={convertedCount} />
            </div>
          </section>

          <section className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.6)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_190px_auto]">
              <label className="relative block">
                <span className="sr-only">Caută lead-uri</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Caută după proprietate, contact, telefon..."
                  className={`${controlClassName} w-full pl-10`}
                />
              </label>

              <label>
                <span className="sr-only">Filtrează după status</span>
                <select
                  value={leadFilter}
                  onChange={(event) => setLeadFilter(event.target.value as "all" | LeadStatus)}
                  className={`${controlClassName} w-full`}
                >
                  <option value="all">Toate statusurile ({leadItems.length})</option>
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {leadStatusMeta[status].label} ({statusCounts[status]})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="sr-only">Sortează lead-urile</span>
                <select
                  value={leadSort}
                  onChange={(event) => setLeadSort(event.target.value as LeadSort)}
                  className={`${controlClassName} w-full`}
                >
                  <option value="newest">Cele mai noi</option>
                  <option value="oldest">Cele mai vechi</option>
                  <option value="property">Nume proprietate</option>
                  <option value="follow_up">Următorul follow-up</option>
                </select>
              </label>

              <button
                type="button"
                onClick={resetFilters}
                disabled={!searchQuery && leadFilter === "all" && leadSort === "newest"}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-800"
              >
                Resetează
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>{visibleLeads.length} din {leadItems.length} lead-uri</span>
              {searchQuery.trim() ? <span className="truncate">Rezultate pentru „{searchQuery.trim()}”</span> : null}
            </div>
          </section>

          {leadItems.length === 0 ? (
            <AdminEmptyState
              title="Nu există lead-uri"
              description="Lead-urile noi vor apărea aici după cold calling sau după formularul de deplasări."
              actions={
                canManageLeads ? (
                  <button type="button" onClick={() => setCreateLeadOpen(true)} className={primaryActionClassName}>
                    Adaugă primul lead
                  </button>
                ) : undefined
              }
            />
          ) : visibleLeads.length === 0 ? (
            <AdminEmptyState
              title="Niciun rezultat pentru filtrele curente"
              description="Încearcă alt termen de căutare sau resetează filtrele."
              actions={
                <button type="button" onClick={resetFilters} className={secondaryActionClassName}>
                  Resetează filtrele
                </button>
              }
            />
          ) : (
            <>
              <div className="grid gap-3 xl:hidden">
                {visibleLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    action={leadActions[lead.id]}
                    canManage={canManageLeads}
                    onStatusChange={updateLeadStatus}
                    onCreateListing={createListingFromLead}
                    onEditListing={(listingId) => router.push(`/edit-property/${listingId}`)}
                    onOpenCalendar={switchToCalendar}
                  />
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_55px_-42px_rgba(15,23,42,0.65)] xl:block dark:border-zinc-800 dark:bg-zinc-900">
                <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_190px_minmax(220px,0.9fr)] gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <span>Lead</span>
                  <span>Contact</span>
                  <span>Locație & follow-up</span>
                  <span>Status</span>
                  <span>Acțiuni</span>
                </div>
                {visibleLeads.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    action={leadActions[lead.id]}
                    canManage={canManageLeads}
                    onStatusChange={updateLeadStatus}
                    onCreateListing={createListingFromLead}
                    onEditListing={(listingId) => router.push(`/edit-property/${listingId}`)}
                    onOpenCalendar={switchToCalendar}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {internalTab === "calendar" && <CalendarDeploymentsClient />}

      <LeadCreateModal
        open={createLeadOpen}
        onClose={() => setCreateLeadOpen(false)}
        onCreated={(message) => {
          onStatusMessage(message);
          markPageModified();
          router.refresh();
        }}
      />
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white text-emerald-800 shadow-sm dark:bg-zinc-800 dark:text-emerald-300"
          : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-t border-white/10 px-5 py-4 first:border-l-0 first:border-t-0 sm:border-l sm:[&:nth-child(2)]:border-t-0 lg:border-t-0">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-medium text-emerald-100/70">{label}</div>
    </div>
  );
}

type LeadViewProps = {
  lead: LeadItem;
  action?: LeadAction;
  canManage: boolean;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onCreateListing: (leadId: string) => void;
  onEditListing: (listingId: string) => void;
  onOpenCalendar: () => void;
};

function LeadCard({
  lead,
  action,
  canManage,
  onStatusChange,
  onCreateListing,
  onEditListing,
  onOpenCalendar,
}: LeadViewProps) {
  return (
    <article className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-[0_16px_45px_-38px_rgba(15,23,42,0.7)] dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-gray-950 dark:text-gray-100">{lead.propertyName}</h3>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {getSourceLabel(lead.source)} · {formatDate(lead.createdAt)}
          </div>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl bg-gray-50 p-3 text-sm dark:bg-zinc-950/50 sm:grid-cols-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">Contact</div>
          <ContactDetails lead={lead} />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">Locație</div>
          <div className="mt-1.5 text-gray-700 dark:text-gray-300">{getLocation(lead)}</div>
          {lead.followUpAt ? (
            <div className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              Follow-up: {formatDate(lead.followUpAt)}
            </div>
          ) : null}
        </div>
      </div>

      {lead.notes ? (
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-gray-500 dark:text-gray-400">{lead.notes}</p>
      ) : null}

      <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] dark:border-zinc-800">
        <StatusSelect
          lead={lead}
          action={action}
          canManage={canManage}
          onStatusChange={onStatusChange}
        />
        <ListingAction
          lead={lead}
          action={action}
          canManage={canManage}
          onCreateListing={onCreateListing}
          onEditListing={onEditListing}
        />
        <button type="button" onClick={onOpenCalendar} className={secondaryActionClassName}>
          Calendar
        </button>
      </div>
    </article>
  );
}

function LeadRow({
  lead,
  action,
  canManage,
  onStatusChange,
  onCreateListing,
  onEditListing,
  onOpenCalendar,
}: LeadViewProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_190px_minmax(220px,0.9fr)] gap-4 border-b border-gray-100 px-5 py-4 text-sm transition last:border-b-0 hover:bg-emerald-50/30 dark:border-zinc-800 dark:hover:bg-emerald-950/10">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate font-semibold text-gray-950 dark:text-gray-100">{lead.propertyName}</div>
          {lead.listingId ? (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              Listing
            </span>
          ) : null}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {getSourceLabel(lead.source)} · {formatDate(lead.createdAt)}
        </div>
        {lead.notes ? <div className="mt-2 line-clamp-2 text-xs leading-5 text-gray-400">{lead.notes}</div> : null}
      </div>

      <ContactDetails lead={lead} />

      <div className="text-gray-600 dark:text-gray-300">
        <div>{getLocation(lead)}</div>
        {lead.followUpAt ? (
          <div className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            Follow-up: {formatDate(lead.followUpAt)}
          </div>
        ) : (
          <div className="mt-1.5 text-xs text-gray-400">Fără follow-up</div>
        )}
      </div>

      <div className="space-y-2">
        <StatusBadge status={lead.status} />
        <StatusSelect
          lead={lead}
          action={action}
          canManage={canManage}
          onStatusChange={onStatusChange}
        />
      </div>

      <div className="flex flex-wrap content-start gap-2">
        <ListingAction
          lead={lead}
          action={action}
          canManage={canManage}
          onCreateListing={onCreateListing}
          onEditListing={onEditListing}
        />
        <button type="button" onClick={onOpenCalendar} className={secondaryActionClassName}>
          Calendar
        </button>
      </div>
    </div>
  );
}

function ContactDetails({ lead }: { lead: LeadItem }) {
  return (
    <div className="min-w-0 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
      <div className="truncate font-medium text-gray-800 dark:text-gray-200">{lead.contactName || "Contact nespecificat"}</div>
      {lead.phone ? (
        <a
          href={`tel:${lead.phone.replace(/\s/g, "")}`}
          className="block truncate text-emerald-700 transition hover:text-emerald-900 hover:underline dark:text-emerald-400"
        >
          {lead.phone}
        </a>
      ) : (
        <div className="text-xs text-gray-400">Fără telefon</div>
      )}
      {lead.email ? (
        <a
          href={`mailto:${lead.email}`}
          className="block truncate text-xs text-gray-500 transition hover:text-emerald-800 hover:underline dark:text-gray-400"
        >
          {lead.email}
        </a>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const meta = leadStatusMeta[status];
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function StatusSelect({
  lead,
  action,
  canManage,
  onStatusChange,
}: Pick<LeadViewProps, "lead" | "action" | "canManage" | "onStatusChange">) {
  return (
    <select
      value={lead.status}
      onChange={(event) => onStatusChange(lead.id, event.target.value as LeadStatus)}
      disabled={!canManage || Boolean(action)}
      aria-label={`Schimbă statusul pentru ${lead.propertyName}`}
      className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-200"
    >
      {LEAD_STATUSES.map((status) => (
        <option key={status} value={status}>{leadStatusMeta[status].label}</option>
      ))}
    </select>
  );
}

function ListingAction({
  lead,
  action,
  canManage,
  onCreateListing,
  onEditListing,
}: Pick<LeadViewProps, "lead" | "action" | "canManage" | "onCreateListing" | "onEditListing">) {
  if (lead.listingId) {
    return (
      <button type="button" onClick={() => onEditListing(lead.listingId as string)} className={secondaryActionClassName}>
        Editează listing
      </button>
    );
  }

  if (!canManage) return null;

  return (
    <button
      type="button"
      onClick={() => onCreateListing(lead.id)}
      disabled={Boolean(action)}
      className={primaryActionClassName}
    >
      {action === "listing" ? "Se creează..." : "Creează draft"}
    </button>
  );
}
