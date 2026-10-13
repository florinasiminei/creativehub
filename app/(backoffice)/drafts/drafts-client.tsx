"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import BackofficeSidebar from "@/components/admin/BackofficeSidebar";
import BackofficeTopBar from "@/components/admin/BackofficeTopBar";
import BackofficeMobileDrawer from "@/components/admin/BackofficeMobileDrawer";
import CatalogSection from "@/components/admin/sections/CatalogSection";
import LeadsCalendarSection from "@/components/admin/sections/LeadsCalendarSection";
import SettingsSection from "@/components/admin/sections/SettingsSection";
import {
  countExpiringListings,
  countExpiredListings,
  type AttractionItem,
  type BackofficeSection,
  type DraftItem,
  type LeadItem,
  type OwnerClaimItem,
  type PublicationPeriodItem,
} from "@/lib/admin/draftsDashboard";

type Props = {
  listings: DraftItem[];
  attractions: AttractionItem[];
  leads: LeadItem[];
  publicationPeriods: PublicationPeriodItem[];
  ownerClaims: OwnerClaimItem[];
  role: string;
  siteUrl?: string | null;
  seoContent?: ReactNode;
};

export default function DraftsClient({
  listings,
  attractions,
  leads,
  publicationPeriods,
  ownerClaims,
  role,
  siteUrl = null,
  seoContent = null,
}: Props) {
  const searchParams = useSearchParams();

  const [activeSection, setActiveSection] = useState<BackofficeSection>("catalog");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showUpdatedNotice, setShowUpdatedNotice] = useState(false);
  const [showCreatedNotice, setShowCreatedNotice] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setShowUpdatedNotice(searchParams.get("updated") === "1");
    setShowCreatedNotice(searchParams.get("created") === "1");
    setCreatedId(searchParams.get("id"));
    const tabParam = searchParams.get("tab") as string | null;
    if (tabParam) {
      const legacyMap: Record<string, BackofficeSection> = {
        dashboard: "catalog",
        properties: "catalog",
        renewals: "catalog",
        leads: "leads-calendar",
        calendar: "leads-calendar",
        attractions: "catalog",
        content: "catalog",
        seo: "catalog",
        settings: "settings",
      };
      const mapped = legacyMap[tabParam];
      if (mapped) setActiveSection(mapped);
    }
  }, [searchParams]);

  const listingCount = listings.length;
  const openLeadsCount = useMemo(
    () => leads.filter((lead) => !["convertit", "neinteresat", "inactiv"].includes(lead.status)).length,
    [leads]
  );
  const expiringCount = useMemo(
    () => countExpiringListings(listings) + countExpiredListings(listings),
    [listings]
  );

  const sectionTitle = activeSection === "catalog"
    ? "Catalog"
    : activeSection === "leads-calendar"
      ? "Leads & Calendar"
      : "Setări";

  return (
    <>
      <BackofficeSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        role={role}
        listingCount={listingCount}
        openLeadsCount={openLeadsCount}
        attractionCount={attractions.length}
        expiringCount={expiringCount}
      />

      <BackofficeMobileDrawer
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        role={role}
        listingCount={listingCount}
        openLeadsCount={openLeadsCount}
        attractionCount={attractions.length}
        expiringCount={expiringCount}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <BackofficeTopBar onHamburgerClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[120rem] px-4 py-6 sm:px-6 lg:px-8 dark:text-gray-100">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sectionTitle}</h1>
            </div>

            {statusMessage && (
              <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-200">
                {statusMessage}
              </div>
            )}

            {activeSection === "catalog" && (
              <CatalogSection
                listings={listings}
                attractions={attractions}
                publicationPeriods={publicationPeriods}
                ownerClaims={ownerClaims}
                role={role}
                siteUrl={siteUrl}
                seoContent={seoContent}
                showUpdatedNotice={showUpdatedNotice}
                showCreatedNotice={showCreatedNotice}
                createdId={createdId}
                onDismissUpdated={() => setShowUpdatedNotice(false)}
                onDismissCreated={() => setShowCreatedNotice(false)}
                onStatusMessage={setStatusMessage}
              />
            )}

            {activeSection === "leads-calendar" && (
              <LeadsCalendarSection
                leads={leads}
                role={role}
                onStatusMessage={setStatusMessage}
              />
            )}

            {activeSection === "settings" && (
              <SettingsSection role={role} />
            )}
          </div>
        </main>
      </div>
    </>
  );
}
