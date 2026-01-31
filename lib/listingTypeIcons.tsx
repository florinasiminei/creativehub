"use client";

import {
  Building2,
  Caravan,
  Home,
  HousePlus,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ListingTypeValue } from "./listingTypes";

const AFrameIcon = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 20L12 4L21 20" />
    <path d="M4.5 20H19.5" />
    <rect x="10.5" y="13" width="3" height="7" rx="0.5" />
    <rect x="7.5" y="11" width="3" height="3" rx="0.4" />
    <rect x="13.5" y="11" width="3" height="3" rx="0.4" />
    <rect x="9.5" y="8" width="2" height="2" rx="0.3" />
    <rect x="12.5" y="8" width="2" height="2" rx="0.3" />
  </svg>
);

const CabnIcon = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12L12 4L21 12" />
    <path d="M5 12H19V20H5Z" />
    <path d="M10 20V15H14V20" />
    <path d="M7 15H9V17H7Z" />
    <path d="M17 7V4.5" />
  </svg>
);

const iconMap: Record<ListingTypeValue, ReactNode> = {
  cabana: CabnIcon,
  "a-frame": AFrameIcon,
  pensiune: <HousePlus size={20} />,
  apartament: <Building2 size={20} />,
  "tiny house": <Caravan size={20} />,
  "casa de vacanta": <Home size={20} />,
};

export const resolveListingTypeIcon = (value: string): ReactNode => {
  return (iconMap as Record<string, ReactNode>)[value] ?? <Home size={20} />;
};
