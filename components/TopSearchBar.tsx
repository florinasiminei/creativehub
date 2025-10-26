"use client";

import SearchModal from "./SearchModal";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineSearch } from "react-icons/ai";
import { FiSliders } from "react-icons/fi";
import {
  Globe2,
  Home,
  Map as MapIcon,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import type {
  FacilityOption,
  Filters,
  SearchSuggestion,
  SearchSuggestionType,
} from "@/lib/types";
import { IoClose } from "react-icons/io5";
import { resolveFacilityIcon } from "@/lib/facilityIcons";

type TopSearchBarProps = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  locatiiSugestii: SearchSuggestion[];
  sugestieIndex: number;
  handleLocatieChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLocatieKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  selectLocatie: (suggestie: SearchSuggestion) => void;
  setLocatiiSugestii: React.Dispatch<React.SetStateAction<SearchSuggestion[]>>;
  minPrice: number;
  maxPrice: number;
  persoaneRange: { min: number; max: number };
  resetFiltre: () => void;
  facilitiesList: FacilityOption[];
  resultsCount?: number;
};

const typeLabels: Record<SearchSuggestionType, string> = {
  destinatie: "Destinatie",
  localitate: "Localitate",
  judet: "Judet",
  regiune: "Regiune",
  proprietate: "Proprietate",
  facilitate: "Facilitate",
};

const typeOrder: SearchSuggestionType[] = [
  "destinatie",
  "localitate",
  "judet",
  "regiune",
  "proprietate",
  "facilitate",
];

function getSuggestionIcon(type: SearchSuggestionType) {
  switch (type) {
    case "destinatie":
      return MapPin;
    case "localitate":
      return MapIcon;
    case "judet":
      return Search;
    case "regiune":
      return Globe2;
    case "proprietate":
      return Home;
    case "facilitate":
    default:
      return Sparkles;
  }
}

function highlightText(
  text: string,
  query: string,
  ranges?: Array<[number, number]>
) {
  if (ranges && ranges.length > 0) {
    const normalized = ranges
      .map(([start, end]) => [
        Math.max(0, start),
        Math.min(text.length - 1, end),
      ])
      .filter(([start, end]) => start <= end)
      .sort((a, b) => a[0] - b[0]);

    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    let key = 0;

    normalized.forEach(([start, end]) => {
      if (start > cursor) {
        nodes.push(text.slice(cursor, start));
      }
      nodes.push(
        <strong key={`match-${key++}`} className="text-emerald-600">
          {text.slice(start, end + 1)}
        </strong>
      );
      cursor = end + 1;
    });

    if (cursor < text.length) {
      nodes.push(text.slice(cursor));
    }

    return nodes;
  }

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

  const hasActiveFilters =
    filters.pretMin > minPrice ||
    filters.pretMax < maxPrice ||
    filters.persoaneMin > persoaneRange.min ||
    filters.persoaneMax < persoaneRange.max ||
    filters.facilities.length > 0 ||
    filters.camere > 0 ||
    filters.paturi > 0 ||
    filters.bai > 0;

  const facilityIconMap = useMemo(() => {
    const iconMap = new Map<string, React.ReactNode>();
    facilitiesList.forEach((facility) => {
      iconMap.set(facility.id, resolveFacilityIcon(facility.name));
    });
    return iconMap;
  }, [facilitiesList]);

  const groupedSuggestions = useMemo(() => {
    const map = new Map<SearchSuggestionType, SearchSuggestion[]>();
    locatiiSugestii.forEach((suggestie) => {
      if (!map.has(suggestie.type)) {
        map.set(suggestie.type, []);
      }
      map.get(suggestie.type)!.push(suggestie);
    });

    return typeOrder
      .map((type) => ({
        type,
        items: map.get(type) ?? [],
      }))
      .filter((group) => group.items.length > 0);
  }, [locatiiSugestii]);

  const suggestionIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    locatiiSugestii.forEach((item, index) => {
      map.set(item.id, index);
    });
    return map;
  }, [locatiiSugestii]);

  return (
    <>
      <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 border-b border-gray-200 bg-transparent py-4 shadow-sm dark:border-zinc-800">
        <div className="relative mx-auto flex w-full max-w-3xl gap-4 px-4">
          {/* Destination Search */}
          <div className="relative flex-1">
            <div className="relative">
              <AiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transform text-xl text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Cauta locatie, proprietate sau facilitate..."
                value={filters.keyword}
                onChange={handleLocatieChange}
                onKeyDown={handleLocatieKeyDown}
                className="h-[48px] w-full rounded-full border border-gray-300 bg-white pl-12 pr-12 text-sm transition-all duration-200 hover:border-emerald-400 hover:ring hover:ring-emerald-300 focus:border-emerald-400 focus:outline-none focus:ring focus:ring-emerald-300 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                role="combobox"
                aria-expanded={locatiiSugestii.length > 0}
                aria-controls="locatii-sugestii"
              />
              {filters.keyword && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, keyword: "", locatie: "" }));
                    setLocatiiSugestii([]);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transform rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-700"
                  aria-label="Clear search"
                >
                  <IoClose className="h-5 w-5" />
                </button>
              )}
            </div>

            {locatiiSugestii.length > 0 && (
              <ul
                ref={dropdownRef}
                id="locatii-sugestii"
                className="absolute z-20 mt-2 w-full max-h-80 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
                role="listbox"
              >
                {groupedSuggestions.map((group) => {
                  const IconComponent = getSuggestionIcon(group.type);
                  return (
                    <React.Fragment key={group.type}>
                      <li
                        role="presentation"
                        className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
                      >
                        {typeLabels[group.type]}
                      </li>
                      {group.items.map((suggestie) => {
                        const globalIndex =
                          suggestionIndexMap.get(suggestie.id) ?? -1;
                        const isActive = globalIndex === sugestieIndex;
                        const facilityIcon =
                          suggestie.type === "facilitate"
                            ? facilityIconMap.get(suggestie.facilityId ?? "") ??
                              resolveFacilityIcon(suggestie.label)
                            : null;
                        return (
                          <li
                            key={suggestie.id}
                            className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
                              isActive
                                ? "bg-emerald-50 dark:bg-emerald-900/30"
                                : "hover:bg-gray-100 dark:hover:bg-zinc-700"
                            }`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                            }}
                            onClick={() => selectLocatie(suggestie)}
                            role="option"
                            aria-selected={isActive}
                          >
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                              {suggestie.type === "facilitate"
                                ? facilityIcon
                                : <IconComponent className="h-5 w-5" />}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {highlightText(
                                  suggestie.label,
                                  filters.keyword,
                                  suggestie.highlightRanges
                                )}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {suggestie.context || typeLabels[suggestie.type]} •{" "}
                                {suggestie.count}{" "}
                                {suggestie.count === 1 ? "rezultat" : "rezultate"}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={`flex h-[48px] items-center gap-2 rounded-full border px-6 transition-all duration-200 hover:border-emerald-400 hover:ring hover:ring-emerald-300 dark:hover:border-emerald-300 dark:hover:ring dark:hover:ring-emerald-200 ${
                hasActiveFilters
                  ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  : "border-gray-300 hover:bg-gray-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
              }`}
            >
              <FiSliders className="text-xl" />
              <span className="hidden sm:inline">Filtre</span>
              {hasActiveFilters && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-600">
                  {filters.facilities.length +
                    (filters.pretMin > minPrice || filters.pretMax < maxPrice ? 1 : 0) +
                    (filters.persoaneMin > persoaneRange.min ||
                    filters.persoaneMax < persoaneRange.max
                      ? 1
                      : 0) +
                    (filters.camere > 0 ? 1 : 0) +
                    (filters.paturi > 0 ? 1 : 0) +
                    (filters.bai > 0 ? 1 : 0)}
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  resetFiltre();
                  setLocatiiSugestii([]);
                }}
                className="flex h-[48px] items-center rounded-full border border-transparent px-5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-900/30"
              >
                Reseteaza
              </button>
            )}
          </div>
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
