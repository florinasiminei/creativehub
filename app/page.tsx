"use client";

import { useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";
import TopSearchBar from "@/components/TopSearchBar";
import FilterSidebar from "@/components/FilterSidebar";
import ListingsGrid from "@/components/ListingGrid";
import Footer from "@/components/Footer";
import { useFuzzyCazari } from "@/hooks/useFuzzyCazari";
import { Cazare } from "@/lib/utils";
import { Filters } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

type ListingRaw = {
  id: string;
  title: string;
  type: string;
  location: string;
  capacity: string;
  price: string;
  listing_facilities: {
    facilities: {
      id: string;
      name: string;
    } | null;
  }[];
};

function getInitialFilters(cazari: Cazare[]): Filters {
  const prices = cazari.map((c) => c.price);
  const persoane = cazari.map((c) => c.numarPersoane);
  return {
    locatie: "",
    keyword: "",
    pretMin: prices.length ? Math.min(...prices) : 0,
    pretMax: prices.length ? Math.max(...prices) : 10000,
    facilities: [],
    persoaneMin: persoane.length ? Math.min(...persoane) : 1,
    persoaneMax: persoane.length ? Math.max(...persoane) : 10,
  };
}

export default function Home() {
  const [cazari, setCazari] = useState<Cazare[]>([]);
  const [facilitiesList, setFacilitiesList] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFiltersRaw] = useState<Filters>({
    locatie: "",
    keyword: "",
    pretMin: 0,
    pretMax: 10000,
    facilities: [],
    persoaneMin: 1,
    persoaneMax: 10,
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [persoaneRange, setPersoaneRange] = useState({ min: 1, max: 10 });
  const [locatiiSugestii, setLocatiiSugestii] = useState<string[]>([]);
  const [sugestieIndex, setSugestieIndex] = useState(-1);

  useEffect(() => {
    async function fetchCazari() {
      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select(`
          id, title, type, location, capacity, price,
          listing_facilities(
            facilities(id, name)
          )
        `);

      if (listingsError || !listingsData) {
        console.error("Error fetching listings:", listingsError);
        return;
      }

      const { data: imagesData, error: imagesError } = await supabase
        .from("listing_images")
        .select("listing_id, image_url, display_order");

      if (imagesError || !imagesData) {
        console.error("Error fetching listing_images:", imagesError);
        return;
      }

      // Create a map: listing_id → first image_url (lowest display_order)
      const imageMap: Record<string, string> = {};
      imagesData.forEach((img) => {
        if (
          !imageMap[img.listing_id] ||
          img.display_order < (imagesData.find(i => i.listing_id === img.listing_id && i.image_url === imageMap[img.listing_id])?.display_order ?? Infinity)
        ) {
          imageMap[img.listing_id] = img.image_url;
        }
      });

      const mapped: Cazare[] = (listingsData as ListingRaw[]).map((c) => ({
        id: c.id,
        title: c.title,
        price: parseInt((c.price || "0").replace(/\D/g, "")) || 0,
        tip: c.type,
        locatie: c.location,
        numarPersoane: parseInt((c.capacity ?? "").match(/\d+/)?.[0] ?? "1"),
        // Map and filter out any null facility (for listings with missing facilities)
        facilities: c.listing_facilities
          .map(f => f.facilities?.id)
          .filter(Boolean) as string[],
        facilitiesNames: c.listing_facilities
          .map(f => f.facilities?.name)
          .filter(Boolean) as string[],
         image: imageMap[c.id]?.trim() ? imageMap[c.id] : "/fallback.jpg",
      }));

      setCazari(mapped);
      setFiltersRaw(getInitialFilters(mapped));
      setPersoaneRange({
        min: mapped.length ? Math.min(...mapped.map((c) => c.numarPersoane)) : 1,
        max: mapped.length ? Math.max(...mapped.map((c) => c.numarPersoane)) : 10,
      });
    }

    fetchCazari();
  }, []);

  useEffect(() => {
    supabase.from("facilities").select("id, name").then(({ data }) => setFacilitiesList(data || []));
  }, []);

  const locatiiUnice = useMemo(() => [...new Set(cazari.map((c) => c.locatie))], [cazari]);
  const fuse = useMemo(() => new Fuse(locatiiUnice, { threshold: 0.3 }), [locatiiUnice]);

  // SUGGESTION & FILTER LOGIC
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
    setFiltersRaw(getInitialFilters(cazari));
    setPersoaneRange({
      min: cazari.length ? Math.min(...cazari.map((c) => c.numarPersoane)) : 1,
      max: cazari.length ? Math.max(...cazari.map((c) => c.numarPersoane)) : 10,
    });
  };

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

      <button
        className="lg:hidden mb-4 ml-4 mt-4 px-4 py-2 bg-teal-600 text-white rounded-md shadow"
        onClick={() => setIsSidebarOpen(true)}
      >
        Filtre
      </button>

      <FilterSidebar
        filters={filters}
        setFilters={setFiltersRaw}
        minPrice={Math.min(...cazari.map((c) => c.price))}
        maxPrice={Math.max(...cazari.map((c) => c.price))}
        persoaneRange={persoaneRange}
        resetFiltre={resetFiltre}
        facilitiesList={facilitiesList}
        visible={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex flex-col lg:flex-row w-full px-4 lg:px-6">
        <div className="hidden lg:block w-[500px] flex-shrink-0">
          <div className="sticky top-24">
            <FilterSidebar
              filters={filters}
              setFilters={setFiltersRaw}
              minPrice={Math.min(...cazari.map((c) => c.price))}
              maxPrice={Math.max(...cazari.map((c) => c.price))}
              persoaneRange={persoaneRange}
              resetFiltre={resetFiltre}
              facilitiesList={facilitiesList}
            />
          </div>
        </div>
        <main className="flex-1 lg:pl-6">
          <section id="cazari" className="py-16">
            <h2 className="text-2xl font-bold mb-8">🎕️ Căzări turistice</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <ListingsGrid cazari={filteredCazari} />
            </div>
            <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
              Total rezultate: {filteredCazari.length}
            </p>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}
