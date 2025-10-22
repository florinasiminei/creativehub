import { useMemo } from "react";
import Fuse from "fuse.js";
import { Cazare } from "../lib/types";
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

    // Facilities filter (AND logic)
    if (filters.facilities.length > 0) {
      result = result.filter((c) =>
        filters.facilities.every((fid) => c.facilities.includes(fid))
      );
    }

    return result;
  }, [cazari, filters]);
}
