// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState, type SetStateAction } from "react";
import Fuse from "fuse.js";
import { TopSearchBar } from "@/components/TopSearchBar";
import ListingsGrid from "@/components/ListingGrid";
import LoadingLogo from "@/components/LoadingLogo";
import Pagination from "@/components/Pagination";
import { useFuzzyCazari } from "@/hooks/useFuzzyCazari";
import { mapListingSummary } from "@/lib/transformers";
import { Cazare } from "@/lib/utils";
import type { FacilityOption, Filters, ListingRaw } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

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

const ITEMS_PER_PAGE = 50;

export default function Home() {
  const [cazari, setCazari] = useState<Cazare[]>([]);
  const [facilitiesList, setFacilitiesList] = useState<FacilityOption[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFiltersState] = useState<Filters>({
    locatie: "",
    keyword: "",
    pretMin: 0,
    pretMax: 10000,
    facilities: [],
    persoaneMin: 1,
    persoaneMax: 15,
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

        const mapped = (data as unknown as ListingRaw[]).map((row) => mapListingSummary(row));

        if (cancelled) return;

        setCazari(mapped);
        const init = getInitialFilters(mapped);
        setFilters(init);
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
    setFilters((prev) => ({ ...prev, locatie: val, keyword: val }));
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
    setFilters((prev) => ({ ...prev, locatie, keyword: locatie }));
    setLocatiiSugestii([]);
    setSugestieIndex(-1);
  };

  const resetFiltre = () => {
    const init = getInitialFilters(cazari);
    setFilters(init);
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
      label: `🔍 ${filters.keyword}`,
      onClear: () => setFilters((prev) => ({ ...prev, keyword: "", locatie: "" })),
    });
  }

  if (filters.pretMin > minPriceAll || filters.pretMax < maxPriceAll) {
    activeFilterChips.push({
      key: "price",
      label: `💰 ${filters.pretMin} - ${filters.pretMax} lei/noapte`,
      onClear: () => setFilters((prev) => ({ ...prev, pretMin: minPriceAll, pretMax: maxPriceAll })),
    });
  }

  if (filters.persoaneMin > persoaneRange.min || filters.persoaneMax < persoaneRange.max) {
    activeFilterChips.push({
      key: "people",
      label: `👥 ${filters.persoaneMin} - ${filters.persoaneMax} ${filters.persoaneMin === filters.persoaneMax ? 'persoane' : ''}`,
      onClear: () =>
        setFilters((prev) => ({
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
      label: `✨ ${name}`,
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
      {/* Hero section hint */}
      {cazari.length > 0 && !filters.keyword && (
        <div className="w-full flex justify-center py-2 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border-b border-gray-100 dark:border-zinc-800">
          <div className="max-w-3xl px-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💫 Scrie numele unei locații și descoperă cazări de vis! Munte, mare, oraș... tu alegi! 🏔️🌊
            </p>
          </div>
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

      <main className="w-full px-4 lg:px-6">
        <section id="cazari" className="py-8">
          <h2 className="text-xl font-medium mb-6">🏡 Descoperă cazările tale preferate</h2>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 min-h-[60vh]">
              <LoadingLogo />
              <p className="mt-4 text-gray-500 dark:text-gray-400 animate-pulse">
                🔍 Căutăm cele mai frumoase locuri pentru tine...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
              <div className="flex items-center">
                <div className="text-red-600 dark:text-red-400 text-xl mr-3">😅</div>
                <div>
                  <h3 className="text-red-800 dark:text-red-200 font-semibold">Oops! Ceva nu a mers bine</h3>
                  <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                  >
                    🔄 Încearcă din nou
                  </button>
                </div>
              </div>
            </div>
          )}

            {!loading && !error && (
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
                    <>
                      <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                        📄 Pagina {currentPage} din {Math.ceil(filteredCazari.length / ITEMS_PER_PAGE)}
                        {filteredCazari.length > 100 && (
                          <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                            🎉 Wow, ai {filteredCazari.length} opțiuni minunate!
                          </span>
                        )}
                      </div>
                      <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(filteredCazari.length / ITEMS_PER_PAGE)}
                        onPageChange={(page) => {
                          setCurrentPage(page);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                    </>
                  )}
                  {filteredCazari.length > 0 && filteredCazari.length <= ITEMS_PER_PAGE && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
                      ✨ Toate cazările tale preferate într-un singur loc!
                    </div>
                  )}
                </div>
              </>
            )}

            {!loading && !error && filteredCazari.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏖️</div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Hmm... nu găsim exact ce cauți
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Nu-ți face griji! Hai să lărgim puțin căutarea și să descoperim împreună locuri minunate. 🌟
                </p>
                <div className="space-y-2 mb-6">
                  <p className="text-sm text-gray-400 dark:text-gray-500">💡 Încearcă să:</p>
                  <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    <li>• Caută o locație mai generală (ex: "Munte" în loc de "Brașov")</li>
                    <li>• Relaxează filtrele de preț sau facilități</li>
                    <li>• Explorează zonele învecinate</li>
                  </ul>
                </div>
                <button
                  onClick={resetFiltre}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full transition transform hover:scale-105"
                >
                  🔄 Hai să căutăm împreună!
                </button>
              </div>
            )}
          </section>
      </main>

    </div>
  );
}
