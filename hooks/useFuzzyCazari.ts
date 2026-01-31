import { useMemo } from "react";
import Fuse from "fuse.js";
import { Cazare } from "../lib/utils";
import { Filters } from "../lib/types";

export function useFuzzyCazari(cazari: Cazare[], filters: Filters) {
  return useMemo(() => {
    let result = cazari;

    // Keyword filter (fuzzy search in title, location, and facilities)
    if (filters.keyword.trim()) {
      const fuse = new Fuse(result, {
        keys: ["title", "locatie", "facilitiesNames"],
        threshold: 0.35,
      });
      result = fuse.search(filters.keyword).map((r) => r.item);
    }

    // Price filter
    result = result.filter(
      (c) => c.price >= filters.pretMin && c.price <= filters.pretMax
    );

    // Persons filter
    result = result.filter(
      (c) => c.numarPersoane >= filters.persoaneMin && c.numarPersoane <= filters.persoaneMax
    );

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
