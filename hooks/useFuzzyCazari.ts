import { useMemo } from "react";
import Fuse from "fuse.js";
import { Cazare } from "../lib/utils";
import { Filters } from "../lib/types";
import {
  allRegions,
  parseLocationLabel,
  resolveRegionForLocation,
  normalizeRegionText,
} from "@/lib/regions";

function parseCapacity(capacity: string | number): { min: number; max: number } {
  const str = String(capacity).trim();
  
  // Range: 5-6 or 5/6
  const rangeMatch = str.match(/^(\d+)\s*[-/]\s*(\d+)\s*$/);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    return { min, max: Math.max(min, max) };
  }
  
  // Plus: 5+
  const plusMatch = str.match(/^(\d+)\s*\+\s*$/);
  if (plusMatch) {
    const base = Number(plusMatch[1]);
    return { min: base, max: base };
  }
  
  // Single number
  const num = Number(str);
  if (Number.isFinite(num)) {
    return { min: num, max: num };
  }
  
  return { min: 1, max: 1 };
}

export function useFuzzyCazari(cazari: Cazare[], filters: Filters) {
  return useMemo(() => {
    let result = cazari;

    // Keyword filter (fuzzy search in title, location, and facilities)
    if (filters.keyword.trim()) {
      const keyword = filters.keyword.trim();
      const normalizedKeyword = normalizeRegionText(keyword);
      const hasExactCounty = result.some((c) => {
        const { county } = parseLocationLabel(c.locatie);
        return normalizeRegionText(county) === normalizedKeyword;
      });

      if (hasExactCounty) {
        result = result.filter((c) => {
          const { county } = parseLocationLabel(c.locatie);
          return normalizeRegionText(county) === normalizedKeyword;
        });
      } else {
        const hasExactCity = result.some((c) => {
          const { city } = parseLocationLabel(c.locatie);
          return normalizeRegionText(city) === normalizedKeyword;
        });

        if (hasExactCity) {
          result = result.filter((c) => {
            const { city } = parseLocationLabel(c.locatie);
            return normalizeRegionText(city) === normalizedKeyword;
          });
        } else {
          const matchedRegion = allRegions.find((region) => {
            const nameNorm = normalizeRegionText(region.name);
            const slugNorm = normalizeRegionText(region.slug);
            return nameNorm === normalizedKeyword || slugNorm === normalizedKeyword;
          });

          if (matchedRegion) {
            result = result.filter((c) => {
              const { city, county } = parseLocationLabel(c.locatie);
              const region = resolveRegionForLocation(city, county);
              return region?.slug === matchedRegion.slug;
            });
          } else {
            const fuse = new Fuse(result, {
              keys: ["title", "locatie", "facilitiesNames"],
              threshold: 0.35,
            });
            result = fuse.search(keyword).map((r) => r.item);
          }
        }
      }
    }

    // Price filter
    result = result.filter(
      (c) => c.price >= filters.pretMin && c.price <= filters.pretMax
    );

    // Persons filter
    result = result.filter((c) => {
      const { min, max } = parseCapacity(c.numarPersoane);
      return max >= filters.persoaneMin && min <= filters.persoaneMax;
    });

    if (filters.camere > 0) {
      result = result.filter((c) => c.camere >= filters.camere);
    }

    if (filters.paturi > 0) {
      result = result.filter((c) => c.paturi >= filters.paturi);
    }

    if (filters.bai > 0) {
      result = result.filter((c) => c.bai >= filters.bai);
    }

    if (filters.tipuri.length > 0) {
      const allowed = new Set(filters.tipuri.map((t) => t.toLowerCase()));
      result = result.filter((c) => allowed.has(String(c.tip || "").toLowerCase()));
    }

    // Facilities filter (AND logic)
    if (filters.facilities.length > 0) {
      result = result.filter((c) =>
        filters.facilities.every((fid) => c.facilities.includes(fid))
      );
    }

    return result;
  }, [cazari, filters]);
}
