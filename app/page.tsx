"use client";

import Head from "next/head";
import { useState, useEffect, useCallback, useMemo } from "react";
import { FiFilter } from "react-icons/fi";
import { BsFillSunFill, BsFillMoonFill } from "react-icons/bs";
import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

const Range = Slider.Range;
import { supabase } from "@/lib/supabaseClient";
import Fuse from "fuse.js";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cazari, setCazari] = useState([]);
  const [filters, setFilters] = useState({
    locatie: "",
    keyword: "",
    pretMin: 0,
    pretMax: 10000,
    facilitati: "",
    persoane: 1,
  });
  const [locatiiSugestii, setLocatiiSugestii] = useState<string[]>([]);
  const [sugestieIndex, setSugestieIndex] = useState(-1);

  useEffect(() => {
    async function fetchCazari() {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          title,
          type,
          location,
          capacity,
          price,
          image_url,
          listing_facilities (
            facilities (
              name
            )
          )
        `);

      if (error) {
        console.error("Error fetching listings:", error);
        return;
      }

      const mapped = data.map((c) => ({
        id: c.id,
        title: c.title,
        price: parseInt((c.price || "0").replace(/\D/g, "")) || 0,
        tip: c.type,
        locatie: c.location,
        numarPersoane: parseInt(c.capacity?.match(/\d+/)?.[0]) || 1,
        facilitati: c.listing_facilities?.map((f) => f.facilities.name) || [],
        image: c.image_url || "/images/portfolio1.jpg",
      }));

      setCazari(mapped);

      if (mapped.length > 0) {
        const prices = mapped.map((c) => c.price);
        setFilters((prev) => ({
          ...prev,
          pretMin: Math.min(...prices),
          pretMax: Math.max(...prices),
        }));
      }
    }

    fetchCazari();
  }, []);

  const prices = cazari.map((c) => c.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 10000;

  const locatiiUnice = [...new Set(cazari.map((c) => c.locatie))];
  const fuse = new Fuse(locatiiUnice, { threshold: 0.3 });

  const handleLocatieChange = (e) => {
    const val = e.target.value;
    setFilters((prev) => ({ ...prev, locatie: val }));

    if (val.trim() === "") {
      setLocatiiSugestii([]);
    } else {
      const results = fuse.search(val);
      const sugestii = results.map((result) => {
        const location = result.item;
        const count = cazari.filter((c) => c.locatie === location).length;
        return `${location} – ${count} proprietăți`;
      });
      setLocatiiSugestii(sugestii);
    }
    setSugestieIndex(-1);
  };

  const handleLocatieKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSugestieIndex((prev) =>
        prev < locatiiSugestii.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSugestieIndex((prev) =>
        prev > 0 ? prev - 1 : locatiiSugestii.length - 1
      );
    } else if (e.key === "Enter" && sugestieIndex >= 0) {
      e.preventDefault();
      selectLocatie(locatiiSugestii[sugestieIndex]);
    } else if (e.key === "Escape") {
      setLocatiiSugestii([]);
    }
  };

  const handleKeywordChange = (e) => {
    setFilters((prev) => ({ ...prev, keyword: e.target.value }));
  };

  const selectLocatie = (locatieSugestie) => {
    const locatie = locatieSugestie.split(" – ")[0].trim();
    setFilters((prev) => ({ ...prev, locatie }));
    setLocatiiSugestii([]);
    setSugestieIndex(-1);
  };

  const resetFiltre = () => {
    if (cazari.length > 0) {
      const prices = cazari.map((c) => c.price);
      setFilters({
        locatie: "",
        keyword: "",
        pretMin: Math.min(...prices),
        pretMax: Math.max(...prices),
        facilitati: "",
        persoane: 1,
      });
    }
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") || "light";
    setDarkMode(storedTheme === "dark");
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode, mounted]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const filteredCazari = useMemo(() => {
    return cazari.filter((cazare) => {
      const matchLocatie =
        filters.locatie === "" ||
        cazare.locatie.toLowerCase().includes(filters.locatie.toLowerCase());

      const matchPret =
        cazare.price >= filters.pretMin && cazare.price <= filters.pretMax;

      const matchFacilitati =
        filters.facilitati === "" ||
        cazare.facilitati.some((f) =>
          f.toLowerCase().includes(filters.facilitati.toLowerCase())
        );

      const matchPersoane = cazare.numarPersoane >= filters.persoane;

      const matchKeyword =
        filters.keyword === "" ||
        cazare.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
        cazare.locatie.toLowerCase().includes(filters.keyword.toLowerCase()) ||
        cazare.facilitati.some((f) =>
          f.toLowerCase().includes(filters.keyword.toLowerCase())
        );

      return (
        matchLocatie && matchPret && matchFacilitati && matchPersoane && matchKeyword
      );
    });
  }, [filters, cazari]);

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>cabn.ro</title>
        <meta
          name="description"
          content="Cazări unice în natură, direct de la proprietari."
        />
      </Head>

      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white relative">
        {/* Dark Mode Toggle */}
        <div className="fixed top-5 right-5 z-50">
          <button
            onClick={toggleDarkMode}
            aria-label="Comută tema"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-700 shadow-md"
          >
            {darkMode ? (
              <BsFillMoonFill className="text-yellow-300" size={20} />
            ) : (
              <BsFillSunFill className="text-yellow-500" size={20} />
            )}
          </button>
        </div>

        {/* Navbar */}
        <header className="sticky top-0 z-40 bg-white dark:bg-black py-4 shadow-sm border-b transition duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between px-6 gap-4">
            <Image src="/logo.svg" alt="cabn.ro logo" width={160} height={70} />
            <div className="flex gap-8 text-sm uppercase font-medium items-center justify-center">
              <Link href="#cazari" className="hover:text-green-500 transition">
                🏕️ Cazări geniale
              </Link>
              <Link href="#atractii" className="hover:text-green-500 transition">
                🧭 Atracții
              </Link>
            </div>
            <Link
              href="#adauga"
              className="bg-green-500 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-green-600 transition"
            >
              Adaugă proprietate
            </Link>
          </div>
        </header>

        {/* Search Filters */}
        <div className="bg-white dark:bg-zinc-800 py-10 px-4 border-b border-gray-200 dark:border-zinc-700 shadow-sm">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 items-start">
            {/* LOCATIE */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Caută locație
              </label>
              <input
                type="text"
                placeholder="Ex: Bran, Colibița"
                value={filters.locatie}
                onChange={handleLocatieChange}
                onKeyDown={handleLocatieKeyDown}
                onBlur={() => setTimeout(() => setLocatiiSugestii([]), 100)}
                className="w-full p-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-black text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
              />
              {locatiiSugestii.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md shadow z-20 max-h-48 overflow-y-auto">
                  {locatiiSugestii.map((locatie, index) => (
                    <li
                      key={locatie}
                      onMouseDown={() => selectLocatie(locatie)}
                      className={`px-4 py-2 text-sm cursor-pointer transition ${
                        index === sugestieIndex
                          ? "bg-gray-100 dark:bg-zinc-700 font-medium"
                          : "hover:bg-gray-100 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {locatie}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* PRET */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interval preț: {filters.pretMin} – {filters.pretMax} lei
              </label>
              <Range
                min={minPrice}
                max={maxPrice}
                step={10}
                value={[filters.pretMin, filters.pretMax]}
                allowCross={false}
                onChange={([pretMin, pretMax]) =>
                  setFilters((prev) => ({ ...prev, pretMin, pretMax }))
                }
              />
            </div>

            {/* PERSOANE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Număr persoane: {filters.persoane === 10 ? "10+" : filters.persoane}
              </label>
              <Slider
                min={1}
                max={10}
                step={1}
                value={filters.persoane}
                onChange={(persoane) =>
                  setFilters((prev) => ({ ...prev, persoane }))
                }
              />
            </div>

            {/* RESET BUTTON */}
            <div className="flex justify-start md:justify-end pt-6">
              <button
                onClick={resetFiltre}
                className="text-sm text-teal-600 hover:text-teal-700 underline transition"
              >
                Resetează filtrele
              </button>
            </div>
          </div>
        </div>

        {/* Cazari Section */}
        <section id="cazari" className="py-16 px-4 max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">🏕️ Cazări geniale</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredCazari.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 dark:text-gray-400">
                Nicio cazare găsită pentru criteriile selectate.
              </div>
            ) : (
              filteredCazari.map((cazare) => (
                <div
                  key={cazare.id}
                  className="space-y-2 text-left transition-transform hover:-translate-y-1"
                >
                  <Image
                    src={cazare.image}
                    width={800}
                    height={600}
                    alt={`Imagine ${cazare.title}`}
                    className="rounded-xl border object-cover w-full h-[250px]"
                  />
                  <div className="font-semibold text-md">{cazare.title}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {cazare.locatie} — de la {cazare.price} lei/noapte
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    👥 {cazare.numarPersoane} persoane
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Total count */}
          <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
            Total rezultate: {filteredCazari.length}
          </p>
        </section>

        {/* Footer */}
        <footer className="py-8 bg-black text-white text-center mt-12">
          <p className="text-sm opacity-80 lowercase mb-4">
            © 2024 cabn.ro – Toate drepturile rezervate.
          </p>
          <div className="flex justify-center gap-6 text-xl">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-400 transition"
            >
              <FaFacebookF />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-400 transition"
            >
              <FaInstagram />
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-400 transition"
            >
              <FaTiktok />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-400 transition"
            >
              <FaYoutube />
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
