"use client";

import React, { useEffect, useRef, useState } from "react";
import { AiOutlineSearch } from "react-icons/ai";
import { FiSliders } from "react-icons/fi";
import type { Filters, FacilityOption } from "@/lib/types";
import SearchModal from "./SearchModal";

type TopSearchBarProps = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  locatiiSugestii: string[];
  sugestieIndex: number;
  handleLocatieChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLocatieKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  selectLocatie: (locatie: string) => void;
  setLocatiiSugestii: (arr: string[]) => void;
  minPrice: number;
  maxPrice: number;
  persoaneRange: { min: number; max: number };
  resetFiltre: () => void;
  facilitiesList: FacilityOption[];
  resultsCount?: number;
};

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (!lowerText.includes(lowerQuery)) return text;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let matchIndex = lowerText.indexOf(lowerQuery, cursor);
  let key = 0;

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex));
    }

    const match = text.slice(matchIndex, matchIndex + lowerQuery.length);
    parts.push(
      <strong key={`match-${key++}`} className="text-emerald-600">
        {match}
      </strong>
    );

    cursor = matchIndex + lowerQuery.length;
    matchIndex = lowerText.indexOf(lowerQuery, cursor);
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
}

const TopSearchBar = ({
  filters,
  setFilters,
  locatiiSugestii,
  sugestieIndex,
  handleLocatieChange,
  handleLocatieKeyDown,
  selectLocatie,
  setLocatiiSugestii,
  minPrice,
  maxPrice,
  persoaneRange,
  resetFiltre,
  facilitiesList,
  resultsCount,
}: TopSearchBarProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setLocatiiSugestii([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setLocatiiSugestii]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleLocatieChange(e);
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, keyword: value }));
  };

  const hasActiveFilters =
    filters.pretMin > minPrice ||
    filters.pretMax < maxPrice ||
    filters.persoaneMin > persoaneRange.min ||
    filters.persoaneMax < persoaneRange.max ||
    filters.facilities.length > 0;

  return (
    <>
      <div className="w-full flex justify-center py-4 bg-transparent border-b border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="relative w-full max-w-3xl px-4 flex gap-4">
          {/* Destination Search */}
          <div className="flex-1 relative">
            <div className="relative">
              <AiOutlineSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Unde vrei să mergi? 🏔️"
                value={filters.keyword}
                onChange={handleInputChange}
                onKeyDown={handleLocatieKeyDown}
                className="w-full h-[48px] pl-12 pr-4 border border-gray-300 dark:border-zinc-600 rounded-full bg-white dark:bg-zinc-900 text-sm sm:text-base dark:text-white focus:outline-none transition-all duration-200 hover:border-emerald-400 hover:ring hover:ring-emerald-300 focus:border-emerald-400 focus:ring focus:ring-emerald-300"
                role="combobox"
                aria-expanded={locatiiSugestii.length > 0}
                aria-controls="locatii-sugestii"
              />
            </div>

            {locatiiSugestii.length > 0 && (
              <div className="absolute z-10 w-full mt-1">
                <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                  <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-zinc-700">
                    💡 Alege o destinație
                  </div>
                  <ul role="listbox">
                    {locatiiSugestii.map((locatie, index) => (
                      <li
                        key={locatie}
                         className={`px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors ${
                          index === sugestieIndex ? "bg-emerald-50 dark:bg-emerald-900/20" : ""
                        }`}
                        onClick={() => selectLocatie(locatie)}
                        role="option"
                        aria-selected={index === sugestieIndex}
                      >
                        {highlightMatch(locatie, filters.keyword)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Filters Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className={`h-[48px] px-6 rounded-full border flex items-center gap-2 transition-all duration-200 hover:border-emerald-400 hover:ring hover:ring-emerald-300 dark:hover:border-emerald-300 dark:hover:ring dark:hover:ring-emerald-200
              ${
                hasActiveFilters
                  ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  : "border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-800"
              }`}
          >
            <FiSliders className="text-xl" />
            <span className="hidden sm:inline">🎛️ Filtre</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-emerald-100 text-emerald-600 rounded-full">
                {filters.facilities.length +
                  (filters.pretMin > minPrice || filters.pretMax < maxPrice ? 1 : 0) +
                  (filters.persoaneMin > persoaneRange.min ||
                  filters.persoaneMax < persoaneRange.max
                    ? 1
                    : 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      <SearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        filters={filters}
        setFilters={setFilters}
        minPrice={minPrice}
        maxPrice={maxPrice}
        persoaneRange={persoaneRange}
        resetFiltre={resetFiltre}
        facilitiesList={facilitiesList}
        resultsCount={resultsCount}
      />
    </>
  );
};

export { TopSearchBar };
