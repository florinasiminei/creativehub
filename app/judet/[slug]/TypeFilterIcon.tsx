"use client";

import { resolveListingTypeIcon } from "@/lib/listingTypeIcons";
import type { ListingTypeValue } from "@/lib/listingTypes";

type Props = {
  typeValue: ListingTypeValue;
};

export default function TypeFilterIcon({ typeValue }: Props) {
  return (
    <span className="text-emerald-800 dark:text-emerald-200" aria-hidden="true">
      {resolveListingTypeIcon(typeValue)}
    </span>
  );
}
