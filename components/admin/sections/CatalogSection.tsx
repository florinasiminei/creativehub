"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ContentSection from "@/components/admin/sections/ContentSection";
import PropertiesSection from "@/components/admin/sections/PropertiesSection";
import {
  countExpiredListings,
  countExpiringListings,
  countPublishedAttractions,
  countPublishedListings,
  type AttractionItem,
  type DraftItem,
  type PublicationPeriodItem,
} from "@/lib/admin/draftsDashboard";

type CatalogView = "properties" | "attractions" | "seo";

type Props = {
  listings: DraftItem[];
  attractions: AttractionItem[];
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

function getCatalogView(tab: string | null): CatalogView {
  if (tab === "attractions" || tab === "content") return "attractions";
  if (tab === "seo") return "seo";
  return "properties";
}

export default function CatalogSection({
  listings,
  attractions,
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
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<CatalogView>(() => getCatalogView(searchParams.get("tab")));

  useEffect(() => {
    setActiveView(getCatalogView(searchParams.get("tab")));
  }, [searchParams]);

  const metrics = useMemo(() => {
    const publishedListings = countPublishedListings(listings);
    const publishedAttractions = countPublishedAttractions(attractions);
    return {
      catalogItems: listings.length + attractions.length,
      publishedItems: publishedListings + publishedAttractions,
      draftItems:
        listings.filter((item) => item.status === "draft").length +
        Math.max(0, attractions.length - publishedAttractions),
      attentionItems: countExpiringListings(listings) + countExpiredListings(listings),
    };
  }, [attractions, listings]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.95)] dark:border-zinc-800">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Catalog CABN</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Tot conținutul publicabil, organizat clar</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Proprietățile, atracțiile și instrumentele SEO sunt grupate într-un singur flux de administrare.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            {metrics.publishedItems} elemente publicate
          </div>
        </div>

        <div className="grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          <CatalogMetric label="Total catalog" value={metrics.catalogItems} />
          <CatalogMetric label="Publicate" value={metrics.publishedItems} />
          <CatalogMetric label="În draft" value={metrics.draftItems} />
          <CatalogMetric label="Necesită atenție" value={metrics.attentionItems} tone="amber" />
        </div>
      </section>

      <nav
        aria-label="Secțiuni catalog"
        className="grid gap-2 rounded-[22px] border border-gray-200 bg-white p-2 shadow-[0_14px_40px_-34px_rgba(15,23,42,0.7)] sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <CatalogTab
          active={activeView === "properties"}
          label="Proprietăți"
          description={`${listings.length} în catalog`}
          onClick={() => setActiveView("properties")}
        />
        <CatalogTab
          active={activeView === "attractions"}
          label="Atracții"
          description={`${attractions.length} în catalog`}
          onClick={() => setActiveView("attractions")}
        />
        <CatalogTab
          active={activeView === "seo"}
          label="SEO"
          description="Instrumente dedicate"
          onClick={() => setActiveView("seo")}
        />
      </nav>

      {activeView === "properties" && (
        <PropertiesSection
          listings={listings}
          publicationPeriods={publicationPeriods}
          role={role}
          inviteToken={inviteToken}
          siteUrl={siteUrl}
          showUpdatedNotice={showUpdatedNotice}
          showCreatedNotice={showCreatedNotice}
          createdId={createdId}
          onDismissUpdated={onDismissUpdated}
          onDismissCreated={onDismissCreated}
          onStatusMessage={onStatusMessage}
        />
      )}

      {activeView === "attractions" && (
        <ContentSection attractions={attractions} role={role} onStatusMessage={onStatusMessage} />
      )}

      {activeView === "seo" && <SeoCatalogPanel />}
    </div>
  );
}

function CatalogMetric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "amber" }) {
  return (
    <div className="border-t border-white/10 px-5 py-4 first:border-l-0 first:border-t-0 sm:border-l sm:[&:nth-child(2)]:border-t-0 sm:[&:nth-child(3)]:border-l-0 lg:border-t-0 lg:[&:nth-child(3)]:border-l">
      <div className={`text-2xl font-semibold tabular-nums ${tone === "amber" && value > 0 ? "text-amber-300" : ""}`}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-400">{label}</div>
    </div>
  );
}

function CatalogTab({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`rounded-2xl px-4 py-3 text-left transition ${
        active
          ? "bg-emerald-700 text-white shadow-sm"
          : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-zinc-800"
      }`}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className={`mt-0.5 block text-xs ${active ? "text-emerald-100" : "text-gray-400"}`}>{description}</span>
    </button>
  );
}

function SeoCatalogPanel() {
  return (
    <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_55px_-42px_rgba(15,23,42,0.7)] dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            Vizibilitate organică
          </div>
          <h3 className="mt-2 text-2xl font-semibold text-gray-950 dark:text-gray-100">Dashboard SEO dedicat</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
            Instrumentele SEO existente rămân într-un spațiu separat, iar accesul lor este centralizat acum în Catalog.
          </p>
        </div>
        <Link
          href="/admin-seo"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
        >
          Deschide SEO
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
