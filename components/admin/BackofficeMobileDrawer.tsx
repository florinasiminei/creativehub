"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BackofficeSection } from "@/lib/admin/draftsDashboard";

type Props = {
  activeSection: BackofficeSection;
  onSectionChange: (section: BackofficeSection) => void;
  role: string;
  listingCount: number;
  openLeadsCount: number;
  attractionCount: number;
  expiringCount: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const sections: Array<{ id: BackofficeSection; label: string; icon: string }> = [
  { id: "catalog", label: "Catalog", icon: "🗂️" },
  { id: "leads-calendar", label: "Leads & Calendar", icon: "📋" },
  { id: "settings", label: "Setări", icon: "⚙️" },
];

export default function BackofficeMobileDrawer({
  activeSection,
  onSectionChange,
  role,
  listingCount,
  openLeadsCount,
  attractionCount,
  expiringCount,
  mobileOpen,
  onMobileClose,
}: Props) {
  const router = useRouter();

  if (!mobileOpen) return null;

  function getBadge(id: BackofficeSection) {
    switch (id) {
      case "catalog": {
        const catalogCount = listingCount + attractionCount;
        return catalogCount > 0 ? (
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
            {catalogCount}
          </span>
        ) : null;
      }
      case "leads-calendar":
        return openLeadsCount > 0 ? (
          <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
            {openLeadsCount}
          </span>
        ) : null;
      default:
        return null;
    }
  }

  function getSubBadge(id: BackofficeSection) {
    if (id === "catalog" && expiringCount > 0) {
      return (
        <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
          {expiringCount} exp
        </span>
      );
    }
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onMobileClose} />
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 shadow-xl flex flex-col">
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-zinc-800">
          <span className="text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">CABN</span>
          <button type="button" onClick={onMobileClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ✕
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                onSectionChange(section.id);
                onMobileClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="text-base">{section.icon}</span>
              <span>{section.label}</span>
              {getBadge(section.id)}
              {getSubBadge(section.id)}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-200 dark:border-zinc-800">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-zinc-800"
          >
            <span>←</span>
            <span>cabn.ro</span>
          </Link>
          <div className="mt-3 px-3 text-xs text-gray-500 dark:text-gray-500">
            Rol: <span className="font-semibold text-gray-700 dark:text-gray-300">{role}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              document.cookie = "drafts_auth=; Path=/; Max-Age=0";
              router.push("/drafts-login");
            }}
            className="mt-2 w-full text-left px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Deconectare
          </button>
        </div>
      </div>
    </>
  );
}
