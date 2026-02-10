// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState, type SetStateAction } from "react";
import Link from "next/link";
import { useRefreshOnNavigation } from "@/hooks/useRefreshOnNavigation";
import { useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
import { TopSearchBar } from "@/components/TopSearchBar";
import ListingsGrid from "@/components/listing/ListingGrid";
import LoadingLogo from "@/components/LoadingLogo";
import Pagination from "@/components/Pagination";
import { useFuzzyCazari } from "@/hooks/useFuzzyCazari";
import { mapListingSummary } from "@/lib/transformers";
import { sortFacilitiesByPriority } from "@/lib/facilitiesCatalog";
import { getTypeLabel } from "@/lib/listingTypes";
import { Cazare } from "@/lib/utils";
import type { FacilityOption, Filters, ListingRaw, SearchSuggestion } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { normalizeRegionText, parseLocationLabel, resolveRegionForLocation } from "@/lib/regions";

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

function getInitialFilters(cazari: Cazare[]): Filters {
  const prices = cazari.map((c) => c.price);
  const persoane = cazari.flatMap((c) => {
    const { min, max } = parseCapacity(c.numarPersoane);
    return [min, max];
  });
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 10_000;
  const minPers = persoane.length ? Math.min(...persoane) : 1;
  const maxPers = persoane.length ? Math.max(...persoane) : 10;

  return {
    locatie: "",
    keyword: "",
    pretMin: minPrice,
    pretMax: maxPrice,
    tipuri: [],
    facilities: [],
    persoaneMin: minPers,
    persoaneMax: maxPers,
    camere: 0,
    paturi: 0,
    bai: 0,
  };
}

const ITEMS_PER_PAGE = 50;

type HomeClientProps = {
  initialCazari?: Cazare[];
  initialFacilities?: FacilityOption[];
  pageTitle?: string;
  allowClientBootstrapFetch?: boolean;
};

export default function Home({
  initialCazari = [],
  initialFacilities = [],
  pageTitle,
  allowClientBootstrapFetch = true,
}: HomeClientProps) {
  const searchParams = useSearchParams();
  const [cazari, setCazari] = useState<Cazare[]>(initialCazari);
  const [facilitiesList, setFacilitiesList] = useState<FacilityOption[]>(initialFacilities);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFiltersState] = useState<Filters>({
    locatie: "",
    keyword: "",
    pretMin: 0,
    pretMax: 10000,
    tipuri: [],
    facilities: [],
    persoaneMin: 1,
    persoaneMax: 15,
    camere: 0,
    paturi: 0,
    bai: 0,
  });
  const setFilters = useCallback((updater: SetStateAction<Filters>) => {
    setFiltersState((prev) => {
      const next =
        typeof updater === "function" ? (updater as (prev: Filters) => Filters)(prev) : updater;

      if (
        next.locatie === prev.locatie &&
        next.keyword === prev.keyword &&
        next.pretMin === prev.pretMin &&
        next.pretMax === prev.pretMax &&
        next.persoaneMin === prev.persoaneMin &&
        next.persoaneMax === prev.persoaneMax &&
        next.camere === prev.camere &&
        next.paturi === prev.paturi &&
        next.bai === prev.bai &&
        next.tipuri.length === prev.tipuri.length &&
        next.tipuri.every((value, index) => value === prev.tipuri[index]) &&
        next.facilities.length === prev.facilities.length &&
        next.facilities.every((value, index) => value === prev.facilities[index])
      ) {
        return prev;
      }

      setCurrentPage(1);
      return next;
    });
  }, [setCurrentPage, setFiltersState]);
  const [persoaneRange, setPersoaneRange] = useState({ min: 1, max: 10 });
  const [locatiiSugestii, setLocatiiSugestii] = useState<SearchSuggestion[]>([]);
  const [sugestieIndex, setSugestieIndex] = useState(-1);
  const [loading, setLoading] = useState(allowClientBootstrapFetch && initialCazari.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [showSubmittedNotice, setShowSubmittedNotice] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState("");

  // Refresh page when returning from drafts/edit-property
  useRefreshOnNavigation('home');

  useEffect(() => {
    const submitted = searchParams.get("submitted") === "1";
    const updated = searchParams.get("updated") === "1";
    if (submitted) {
      setSubmittedMessage("Proprietatea a fost adaugata cu succes.");
    } else if (updated) {
      setSubmittedMessage("Proprietatea a fost modificata cu succes.");
    } else {
      setSubmittedMessage("");
    }
    setShowSubmittedNotice(submitted || updated);
  }, [searchParams]);

  useEffect(() => {
    if (!showSubmittedNotice) return;
    const timer = window.setTimeout(() => {
      setShowSubmittedNotice(false);
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [showSubmittedNotice]);

  useEffect(() => {
    if (initialCazari.length === 0) return;
    setCazari(initialCazari);
    const init = getInitialFilters(initialCazari);
    setFilters(init);
    const persoane = initialCazari.flatMap((c) => {
      const { min, max } = parseCapacity(c.numarPersoane);
      return [min, max];
    });
    setPersoaneRange({
      min: persoane.length ? Math.min(...persoane) : init.persoaneMin,
      max: persoane.length ? Math.max(...persoane) : init.persoaneMax,
    });
    setLoading(false);
  }, [initialCazari, setFilters]);

  useEffect(() => {
    if (!allowClientBootstrapFetch && initialCazari.length === 0) {
      setLoading(false);
    }
  }, [allowClientBootstrapFetch, initialCazari.length]);

  useEffect(() => {
    if (!allowClientBootstrapFetch || initialCazari.length > 0) return;
    let cancelled = false;

    async function fetchCazari() {
      try {
        setLoading(true);
        setError(null);

        const baseSelect = `
            id, title, slug, type, judet, city, sat, capacity, price, is_published, display_order,
            camere, paturi, bai,
            listing_images(image_url, display_order),
            listing_facilities(
              facilities(id, name)
            )
          `;

        const withOrder = await supabase
          .from("listings")
          .select(baseSelect)
          .eq("is_published", true)
          .order("display_order", { ascending: false, nullsFirst: false })
          .order("display_order", { foreignTable: "listing_images", ascending: true })
          .limit(1, { foreignTable: "listing_images" });

        let data = withOrder.data;
        let error = withOrder.error;

        if (error && String(error.message || "").includes("display_order")) {
          const fallback = await supabase
            .from("listings")
            .select(baseSelect)
            .eq("is_published", true)
            .order("display_order", { foreignTable: "listing_images", ascending: true })
            .limit(1, { foreignTable: "listing_images" });
          data = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;

        const mapped = (data as unknown as ListingRaw[]).map((row) => mapListingSummary(row));

        if (cancelled) return;

        setCazari(mapped);
        const init = getInitialFilters(mapped);
        setFilters(init);
        const persoane = mapped.flatMap((c) => {
          const { min, max } = parseCapacity(c.numarPersoane);
          return [min, max];
        });
        setPersoaneRange({
          min: persoane.length ? Math.min(...persoane) : init.persoaneMin,
          max: persoane.length ? Math.max(...persoane) : init.persoaneMax,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "A apărut o eroare neprevăzută");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCazari();
    return () => {
      cancelled = true;
    };
  }, [setFilters, initialCazari.length, allowClientBootstrapFetch]);

  useEffect(() => {
    if (initialFacilities.length > 0) return;
    let mounted = true;
    supabase
      .from("facilities")
      .select("id, name")
      .then(({ data }) => {
        if (mounted) setFacilitiesList(sortFacilitiesByPriority((data || []) as FacilityOption[]));
      });
    return () => {
      mounted = false;
    };
  }, [initialFacilities.length]);

  const minPriceAll = useMemo(
    () => (cazari.length ? Math.min(...cazari.map((c) => c.price)) : 0),
    [cazari]
  );
  const maxPriceAll = useMemo(
    () => (cazari.length ? Math.max(...cazari.map((c) => c.price)) : 10_000),
    [cazari]
  );

  const facilityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    facilitiesList.forEach((f) => map.set(f.id, f.name));
    return map;
  }, [facilitiesList]);

  type SearchRecord = SearchSuggestion & { aliases: string[] };

  const searchRecords = useMemo<SearchRecord[]>(() => {
    type LocationEntry = {
      label: string;
      ids: Set<string>;
      context?: string;
      aliases: Set<string>;
    };

    type FacilityEntry = {
      label: string;
      ids: Set<string>;
      context?: string;
      aliases: Set<string>;
      facilityId: string;
    };

    const localitati = new Map<string, LocationEntry>();
    const judete = new Map<string, LocationEntry>();
    const regiuni = new Map<string, LocationEntry>();
    const facilitati = new Map<string, FacilityEntry>();
    const records: SearchRecord[] = [];

    const ensureLocationEntry = (
      map: Map<string, LocationEntry>,
      key: string,
      label: string,
      context?: string,
      aliasCandidates: string[] = []
    ) => {
      if (!map.has(key)) {
        map.set(key, {
          label,
          ids: new Set<string>(),
          context,
          aliases: new Set<string>(),
        });
      }
      const entry = map.get(key)!;
      if (!entry.context && context) {
        entry.context = context;
      }
      entry.aliases.add(label);
      aliasCandidates.forEach((alias) => {
        if (alias) entry.aliases.add(alias);
      });
      return entry;
    };

    cazari.forEach((cazare) => {
      const propertyTitle = (cazare.title || "").trim();
      const propertyLocation = (cazare.locatie || "").trim();
      const locationParts = propertyLocation
        ? propertyLocation
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
        : [];

      if (propertyTitle) {
        const aliases = [
          propertyTitle,
          propertyLocation,
          ...locationParts,
          cazare.tip,
        ].filter((alias): alias is string => Boolean(alias));

        records.push({
          id: `proprietate-${cazare.id}`,
          label: propertyTitle,
          value: propertyTitle,
          type: "proprietate",
          count: 1,
          context: propertyLocation || undefined,
          highlightRanges: undefined,
          facilityId: undefined,
          aliases,
        });
      }

      if (locationParts[0]) {
        const aliasCandidates = [
          propertyLocation,
          ...locationParts.slice(1),
        ];
        const entry = ensureLocationEntry(
          localitati,
          locationParts[0].toLowerCase(),
          locationParts[0],
          locationParts.slice(1).join(", ") || propertyLocation || undefined,
          aliasCandidates
        );
        entry.ids.add(cazare.id);
      }

      if (locationParts[1]) {
        const aliasCandidates = [
          propertyLocation,
          locationParts[0],
          ...locationParts.slice(2),
        ];
        const entry = ensureLocationEntry(
          judete,
          locationParts[1].toLowerCase(),
          locationParts[1],
          locationParts[0] || propertyLocation || undefined,
          aliasCandidates
        );
        entry.ids.add(cazare.id);
      }

      const { city, county } = parseLocationLabel(propertyLocation);
      const region = resolveRegionForLocation(city, county);
      if (region) {
        const aliasCandidates = [propertyLocation, county].filter(Boolean);
        const entry = ensureLocationEntry(
          regiuni,
          region.slug,
          region.name,
          county || propertyLocation || undefined,
          aliasCandidates
        );
        entry.ids.add(cazare.id);
      }

      cazare.facilities.forEach((facilityId, index) => {
        const name =
          facilityNameMap.get(facilityId) ||
          cazare.facilitiesNames?.[index] ||
          facilityId;
        const normalizedId = facilityId || name;
        if (!normalizedId || !name) return;
        const key = normalizedId.toLowerCase();
        if (!facilitati.has(key)) {
          facilitati.set(key, {
            label: name,
            ids: new Set<string>(),
            context: "Facilitate",
            aliases: new Set<string>(),
            facilityId,
          });
        }
        const entry = facilitati.get(key)!;
        entry.ids.add(cazare.id);
        entry.aliases.add(name);
        if (propertyLocation) {
          entry.aliases.add(propertyLocation);
        }
      });
    });

    const toRecords = (
      type: "localitate" | "judet" | "regiune",
      source: Map<string, LocationEntry>
    ) => {
      source.forEach((entry, key) => {
        records.push({
          id: `${type}-${key}`,
          label: entry.label,
          value: entry.label,
          type,
          count: entry.ids.size,
          context: entry.context,
          highlightRanges: undefined,
          facilityId: undefined,
          aliases: Array.from(entry.aliases).concat([
            `${entry.label} ${type}`,
            type,
          ]),
        });
      });
    };

    toRecords("localitate", localitati);
    toRecords("judet", judete);
    toRecords("regiune", regiuni);

    facilitati.forEach((entry, key) => {
      records.push({
        id: `facilitate-${key}`,
        label: entry.label,
        value: entry.label,
        type: "facilitate",
        count: entry.ids.size,
        context: entry.context,
        highlightRanges: undefined,
        facilityId: entry.facilityId,
        aliases: Array.from(entry.aliases),
      });
    });

    return records;
  }, [cazari, facilityNameMap]);

  const suggestionFuse = useMemo(() => {
    if (!searchRecords.length) return null;
    return new Fuse(searchRecords, {
      keys: [
        { name: "label", weight: 0.7 },
        { name: "context", weight: 0.2 },
        { name: "aliases", weight: 0.1 },
      ],
      includeMatches: true,
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
  }, [searchRecords]);

  const handleLocatieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFilters((prev) => ({ ...prev, locatie: val, keyword: val }));
    setSugestieIndex(-1);

    if (!val.trim() || !suggestionFuse) {
      setLocatiiSugestii([]);
      return;
    }

    const queryNorm = normalizeRegionText(val);

    const ranked = suggestionFuse.search(val, { limit: 20 }).map((result) => {
      const { item, matches } = result;
      const labelNorm = normalizeRegionText(item.label);

      let highlightRanges: Array<[number, number]> = [];

      if (matches) {
        const labelHighlights = matches
          .filter((m) => m.key === "label")
          .flatMap((m) => m.indices as Array<[number, number]>);

        if (labelHighlights.length > 0) {
          highlightRanges = labelHighlights;
        } else if (matches.some((m) => m.key === "aliases") && item.label.length > 0) {
          highlightRanges = [[0, item.label.length - 1]];
        }
      }

      const { aliases, ...suggestion } = item;
      const exact = labelNorm === queryNorm;
      const startsWith = !exact && labelNorm.startsWith(queryNorm);
      const contains = !exact && !startsWith && labelNorm.includes(queryNorm);
      const score = typeof result.score === "number" ? result.score : 1;

      return {
        ...suggestion,
        highlightRanges,
        _exact: exact,
        _startsWith: startsWith,
        _contains: contains,
        _score: score,
      };
    });

    const hasAdminIntent = ranked.some(
      (item) =>
        (item.type === "judet" || item.type === "localitate" || item.type === "regiune") &&
        (item._exact || item._startsWith)
    );

    const hasPropertyIntent = ranked.some(
      (item) => item.type === "proprietate" && (item._exact || item._startsWith)
    );

    const typePriority: Record<SearchSuggestion["type"], number> = hasAdminIntent
      ? {
          judet: 0,
          localitate: 1,
          regiune: 2,
          proprietate: 3,
          facilitate: 4,
          destinatie: 5,
        }
      : hasPropertyIntent
      ? {
          proprietate: 0,
          destinatie: 1,
          localitate: 2,
          judet: 3,
          regiune: 4,
          facilitate: 5,
        }
      : {
          localitate: 0,
          judet: 1,
          regiune: 2,
          proprietate: 3,
          destinatie: 4,
          facilitate: 5,
        };

    const results = ranked
      .sort((a, b) => {
        const aRank = [
          a._exact ? 0 : 1,
          a._startsWith ? 0 : 1,
          a._contains ? 0 : 1,
          typePriority[a.type],
          a._score,
          -a.count,
          a.label.length,
        ] as const;
        const bRank = [
          b._exact ? 0 : 1,
          b._startsWith ? 0 : 1,
          b._contains ? 0 : 1,
          typePriority[b.type],
          b._score,
          -b.count,
          b.label.length,
        ] as const;

        for (let i = 0; i < aRank.length; i++) {
          if (aRank[i] < bRank[i]) return -1;
          if (aRank[i] > bRank[i]) return 1;
        }
        return 0;
      })
      .slice(0, 12)
      .map(({ _exact, _startsWith, _contains, _score, ...suggestion }) => suggestion);

    setLocatiiSugestii(results);
  };

  const handleLocatieKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSugestieIndex((prev) => (prev < locatiiSugestii.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSugestieIndex((prev) => (prev > 0 ? prev - 1 : locatiiSugestii.length - 1));
    } else if (e.key === "Enter" && sugestieIndex >= 0) {
      e.preventDefault();
      selectLocatie(locatiiSugestii[sugestieIndex]);
    } else if (e.key === "Escape") {
      setLocatiiSugestii([]);
    }
  };

  const locationSuggestionTypes = useMemo(
    () => new Set<SearchSuggestion["type"]>(["localitate", "judet", "regiune"]),
    []
  );

  const selectLocatie = (suggestie: SearchSuggestion) => {
    setFilters((prev) => {
      const isLocationSuggestion = locationSuggestionTypes.has(suggestie.type);
      const nextFacilities =
        suggestie.type === "facilitate" && suggestie.facilityId
          ? prev.facilities.includes(suggestie.facilityId)
            ? prev.facilities
            : [...prev.facilities, suggestie.facilityId]
          : prev.facilities;

      return {
        ...prev,
        keyword: suggestie.value,
        locatie: isLocationSuggestion ? suggestie.value : prev.locatie,
        facilities: nextFacilities,
      };
    });
    setLocatiiSugestii([]);
    setSugestieIndex(-1);
  };

  const resetFiltre = () => {
    const init = getInitialFilters(cazari);
    setFilters(init);
    const persoane = cazari.flatMap((c) => {
      const { min, max } = parseCapacity(c.numarPersoane);
      return [min, max];
    });
    setPersoaneRange({
      min: persoane.length ? Math.min(...persoane) : init.persoaneMin,
      max: persoane.length ? Math.max(...persoane) : init.persoaneMax,
    });
  };

  const activeFilterChips: {
    key: string;
    label: string;
    onClear: () => void;
  }[] = [];

  if (filters.keyword.trim()) {
    activeFilterChips.push({
      key: "keyword",
      label: `Căutare: ${filters.keyword}`,
      onClear: () => setFilters((prev) => ({ ...prev, keyword: "", locatie: "" })),
    });
  }

  if (filters.pretMin > minPriceAll || filters.pretMax < maxPriceAll) {
    activeFilterChips.push({
      key: "price",
      label: `Preț: ${filters.pretMin} - ${filters.pretMax} lei`,
      onClear: () => setFilters((prev) => ({ ...prev, pretMin: minPriceAll, pretMax: maxPriceAll })),
    });
  }

  if (filters.persoaneMin > persoaneRange.min || filters.persoaneMax < persoaneRange.max) {
    activeFilterChips.push({
      key: "people",
      label: `Persoane: ${filters.persoaneMin} - ${filters.persoaneMax}`,
      onClear: () =>
        setFilters((prev) => ({
          ...prev,
          persoaneMin: persoaneRange.min,
          persoaneMax: persoaneRange.max,
        })),
    });
  }

  if (filters.tipuri.length > 0) {
    filters.tipuri.forEach((tip) => {
      activeFilterChips.push({
        key: `type-${tip}`,
        label: `Tip: ${getTypeLabel(tip)}`,
        onClear: () =>
          setFilters((prev) => ({
            ...prev,
            tipuri: prev.tipuri.filter((t) => t !== tip),
          })),
      });
    });
  }

  if (filters.camere > 0) {
    activeFilterChips.push({
      key: "rooms",
      label: `Camere: ${filters.camere}+`,
      onClear: () =>
        setFilters((prev) => ({
          ...prev,
          camere: 0,
        })),
    });
  }

  if (filters.paturi > 0) {
    activeFilterChips.push({
      key: "beds",
      label: `Paturi: ${filters.paturi}+`,
      onClear: () =>
        setFilters((prev) => ({
          ...prev,
          paturi: 0,
        })),
    });
  }

  if (filters.bai > 0) {
    activeFilterChips.push({
      key: "baths",
      label: `Bai: ${filters.bai}+`,
      onClear: () =>
        setFilters((prev) => ({
          ...prev,
          bai: 0,
        })),
    });
  }

  filters.facilities.forEach((fid) => {
    const name = facilityNameMap.get(fid) || "Facilitate";
    activeFilterChips.push({
      key: `facility-${fid}`,
      label: `Facilitate: ${name}`,
      onClear: () =>
        setFilters((prev) => ({
          ...prev,
          facilities: prev.facilities.filter((f) => f !== fid),
        })),
    });
  });

  const filteredCazari = useFuzzyCazari(cazari, filters);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredCazari.length / ITEMS_PER_PAGE));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredCazari.length, currentPage, setCurrentPage]);

  return (
    <div className="min-h-screen bg-transparent text-black dark:text-white relative">
      {showSubmittedNotice && (
        <div className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 shadow-lg flex items-start justify-between gap-3">
          <span>{submittedMessage || "Proprietatea a fost salvata cu succes."}</span>
          <button
            type="button"
            onClick={() => setShowSubmittedNotice(false)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900"
            aria-label="Inchide"
          >
            ×
          </button>
        </div>
      )}
      <TopSearchBar
        filters={filters}
        setFilters={setFilters}
        locatiiSugestii={locatiiSugestii}
        sugestieIndex={sugestieIndex}
        handleLocatieChange={handleLocatieChange}
        handleLocatieKeyDown={handleLocatieKeyDown}
        selectLocatie={selectLocatie}
        setLocatiiSugestii={setLocatiiSugestii}
        minPrice={minPriceAll}
        maxPrice={maxPriceAll || 10000}
        persoaneRange={persoaneRange}
        resetFiltre={resetFiltre}
        facilitiesList={facilitiesList}
        resultsCount={filteredCazari.length}
      />

      {pageTitle && (
        <div className="w-full px-4 lg:px-6 pt-4">
          <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            {pageTitle}
          </h1>
        </div>
      )}

      <main className="w-full px-4 lg:px-6">
        <section id="cazari" className="py-8">
          <h2 className="text-xl font-medium mb-6">Cazări autentice, atent alese</h2>

          {loading && (
            <div className="flex items-center justify-center py-12 min-h-[60vh]">
              <LoadingLogo />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
              <div className="flex items-center">
                <div className="text-red-600 dark:text-red-400 text-xl mr-3">⚠️</div>
                <div>
                  <h3 className="text-red-800 dark:text-red-200 font-semibold">Eroare la încărcare</h3>
                  <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && cazari.length === 0 && (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 px-6 py-10 text-center">
              <div className="text-5xl mb-3">🏔️</div>
              <h3 className="text-2xl font-semibold text-emerald-900 mb-2">
                Catalogul cabn.ro este în pregătire
              </h3>
              <p className="text-emerald-800/80 max-w-2xl mx-auto">
                Începem să publicăm, una câte una, cabane autentice, A‑frame‑uri, tiny houses, pensiuni și apartamente atent verificate.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/servicii"
                  className="px-6 py-2.5 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 transition"
                >
                  Înscrie proprietatea ta
                </Link>
                <Link
                  href="/contact"
                  className="px-6 py-2.5 rounded-full border border-emerald-300 text-emerald-900 hover:bg-emerald-100 transition"
                >
                  Contactează-ne
                </Link>
              </div>
            </div>
          )}

          {!loading && !error && cazari.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-2 gap-y-8">
                <ListingsGrid
                  cazari={filteredCazari.slice(
                    (currentPage - 1) * ITEMS_PER_PAGE,
                    currentPage * ITEMS_PER_PAGE
                  )}
                />
              </div>
              <div className="text-center">
                {filteredCazari.length > ITEMS_PER_PAGE && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredCazari.length / ITEMS_PER_PAGE)}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}
              </div>
            </>
          )}

          {!loading && !error && cazari.length > 0 && filteredCazari.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">😔</div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Momentan nu avem proprietăți disponibile pentru criteriile selectate.
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Ajustează filtrele pentru a descoperi alte opțiuni.
                </p>
                <button
                  onClick={resetFiltre}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full transition"
                >
                  Resetează filtrele
                </button>
              </div>
            )}
          </section>
      </main>

    </div>
  );
}



