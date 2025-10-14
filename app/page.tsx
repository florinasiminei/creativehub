// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import TopSearchBar from "@/components/TopSearchBar";
import FilterSidebar from "@/components/FilterSidebar";
import ListingsGrid from "@/components/ListingGrid";
import { useFuzzyCazari } from "@/hooks/useFuzzyCazari";
import { Cazare, slugify } from "@/lib/utils";
import { Filters, ListingRaw } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

type Facility = { id: string; name: string };

function num(n: unknown, fallback = 0) {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function getInitialFilters(cazari: Cazare[]): Filters {
  const prices = cazari.map((c) => c.price);
  const persoane = cazari.map((c) => c.numarPersoane);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 10_000;
  const minPers = persoane.length ? Math.min(...persoane) : 1;
  const maxPers = persoane.length ? Math.max(...persoane) : 10;

  return {
    locatie: "",
    keyword: "",
    pretMin: minPrice,
    pretMax: maxPrice,
    facilities: [],
    persoaneMin: minPers,
    persoaneMax: maxPers,
  };
}

export default function Home() {
  const [cazari, setCazari] = useState<Cazare[]>([]);
  const [facilitiesList, setFacilitiesList] = useState<Facility[]>([]);
  const [filters, setFiltersRaw] = useState<Filters>({
    locatie: "",
    keyword: "",
    pretMin: 0,
    pretMax: 10000,
    facilities: [],
    persoaneMin: 1,
    persoaneMax: 10,
  });
  const [persoaneRange, setPersoaneRange] = useState({ min: 1, max: 10 });
  const [locatiiSugestii, setLocatiiSugestii] = useState<string[]>([]);
  const [sugestieIndex, setSugestieIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCazari() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("listings")
          .select(
            `
            id, title, slug, type, location, capacity, price, phone, is_published,
            listing_images(image_url, display_order),
            listing_facilities(
              facilities(id, name)
            )
          `
          )
          .eq("is_published", true)
          .order("display_order", { foreignTable: "listing_images", ascending: true })
          .limit(1, { foreignTable: "listing_images" });

        if (error) throw error;

        const mapped: Cazare[] = (data as unknown as ListingRaw[]).map((row) => {
          const cover = Array.isArray(row.listing_images) && row.listing_images[0]?.image_url
            ? String(row.listing_images[0].image_url).trim()
            : "/fallback.jpg";

          const facIds = (row.listing_facilities ?? [])
            .map((lf) => lf.facilities?.id)
            .filter(Boolean) as string[];
          const facNames = (row.listing_facilities ?? [])
            .map((lf) => lf.facilities?.name)
            .filter(Boolean) as string[];

          return {
            id: row.id,
            title: row.title,
            slug: row.slug || `${slugify(row.title)}-${row.id}`,
            price: num(row.price, 0),
            tip: row.type,
            locatie: row.location,
            numarPersoane: num(row.capacity, 1),
            facilities: facIds,
            facilitiesNames: facNames,
            image: cover,
            phone: row.phone ? String(row.phone) : undefined,
          };
        });

        if (cancelled) return;

        setCazari(mapped);
        const init = getInitialFilters(mapped);
        setFiltersRaw(init);
        setPersoaneRange({
          min: mapped.length ? Math.min(...mapped.map((c) => c.numarPersoane)) : init.persoaneMin,
          max: mapped.length ? Math.max(...mapped.map((c) => c.numarPersoane)) : init.persoaneMax,
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
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("facilities")
      .select("id, name")
      .then(({ data }) => {
        if (mounted) setFacilitiesList(data || []);
      });
    return () => {
      mounted = false;
    };
  }, []);

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

  const locatiiUnice = useMemo(() => [...new Set(cazari.map((c) => c.locatie))], [cazari]);
  const fuse = useMemo(() => new Fuse(locatiiUnice, { threshold: 0.3 }), [locatiiUnice]);

  const handleLocatieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFiltersRaw((prev) => ({ ...prev, locatie: val, keyword: val }));
    setSugestieIndex(-1);
    setLocatiiSugestii(
      val.trim()
        ? fuse.search(val).map((result) => {
            const location = result.item;
            const count = cazari.filter((c) => c.locatie === location).length;
            return `${location} – ${count} proprietăți`;
          })
        : []
    );
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

  const selectLocatie = (locatieSugestie: string) => {
    const locatie = locatieSugestie.split(" – ")[0].trim();
    setFiltersRaw((prev) => ({ ...prev, locatie, keyword: locatie }));
    setLocatiiSugestii([]);
    setSugestieIndex(-1);
  };

  const resetFiltre = () => {
    const init = getInitialFilters(cazari);
    setFiltersRaw(init);
    setPersoaneRange({
      min: cazari.length ? Math.min(...cazari.map((c) => c.numarPersoane)) : init.persoaneMin,
      max: cazari.length ? Math.max(...cazari.map((c) => c.numarPersoane)) : init.persoaneMax,
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
      onClear: () => setFiltersRaw((prev) => ({ ...prev, keyword: "", locatie: "" })),
    });
  }

  if (filters.pretMin > minPriceAll || filters.pretMax < maxPriceAll) {
    activeFilterChips.push({
      key: "price",
      label: `Preț: ${filters.pretMin} - ${filters.pretMax} lei`,
      onClear: () => setFiltersRaw((prev) => ({ ...prev, pretMin: minPriceAll, pretMax: maxPriceAll })),
    });
  }

  if (filters.persoaneMin > persoaneRange.min || filters.persoaneMax < persoaneRange.max) {
    activeFilterChips.push({
      key: "people",
      label: `Persoane: ${filters.persoaneMin} - ${filters.persoaneMax}`,
      onClear: () =>
        setFiltersRaw((prev) => ({
          ...prev,
          persoaneMin: persoaneRange.min,
          persoaneMax: persoaneRange.max,
        })),
    });
  }

  filters.facilities.forEach((fid) => {
    const name = facilityNameMap.get(fid) ?? "Facilitate";
    activeFilterChips.push({
      key: `facility-${fid}`,
      label: `Facilitate: ${name}`,
      onClear: () =>
        setFiltersRaw((prev) => ({
          ...prev,
          facilities: prev.facilities.filter((f) => f !== fid),
        })),
    });
  });

  const filteredCazari = useFuzzyCazari(cazari, filters);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white relative">
      <TopSearchBar
        filters={filters}
        setFilters={setFiltersRaw}
        locatiiSugestii={locatiiSugestii}
        sugestieIndex={sugestieIndex}
        handleLocatieChange={handleLocatieChange}
        handleLocatieKeyDown={handleLocatieKeyDown}
        selectLocatie={selectLocatie}
        setLocatiiSugestii={setLocatiiSugestii}
      />

      <div className="px-4 lg:px-6 mt-4">
        <FilterSidebar
          filters={filters}
          setFilters={setFiltersRaw}
          minPrice={minPriceAll}
          maxPrice={maxPriceAll || 10000}
          persoaneRange={persoaneRange}
          resetFiltre={resetFiltre}
          facilitiesList={facilitiesList}
          resultsCount={filteredCazari.length}
        />
      </div>

      <main className="w-full px-4 lg:px-6">
        <section id="cazari" className="py-16">
            <h2 className="text-2xl font-bold mb-8">Cazări turistice</h2>

            {activeFilterChips.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.key}
                      onClick={chip.onClear}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-medium hover:bg-emerald-100"
                    >
                      {chip.label}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                  <button
                    onClick={resetFiltre}
                    className="text-xs font-medium text-gray-600 dark:text-gray-300 underline-offset-2 hover:underline"
                  >
                    Resetează toate filtrele
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Se încarcă proprietățile...</span>
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

            {!loading && !error && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  <ListingsGrid cazari={filteredCazari} />
                </div>
                <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
                  Rezultate totale: {filteredCazari.length}
                </p>
              </>
            )}

            {!loading && !error && filteredCazari.length === 0 && (
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



