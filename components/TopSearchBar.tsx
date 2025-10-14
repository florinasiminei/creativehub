"use client";
import React, { useEffect, useRef } from "react";

type Filters = {
  locatie: string;
  keyword: string;
  pretMin: number;
  pretMax: number;
  facilities: string[];
  persoaneMin: number;
  persoaneMax: number;
};

type TopSearchBarProps = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  locatiiSugestii: string[];
  sugestieIndex: number;
  handleLocatieChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLocatieKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  selectLocatie: (locatie: string) => void;
  setLocatiiSugestii: (arr: string[]) => void;
};

const TopSearchBar: React.FC<TopSearchBarProps> = ({
  filters,
  setFilters,
  locatiiSugestii,
  sugestieIndex,
  handleLocatieChange,
  handleLocatieKeyDown,
  selectLocatie,
  setLocatiiSugestii,
}) => {
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
    const val = e.target.value;
    setFilters((prev) => ({ ...prev, keyword: val }));
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "ig");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <strong key={i} className="text-emerald-600">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  return (
    <div className="w-full flex justify-center py-4 bg-white dark:bg-black border-b border-gray-200 dark:border-zinc-800 shadow-sm">
      <div className="relative w-full max-w-2xl sm:w-[70%]">
        <input
          ref={inputRef}
          type="text"
          placeholder="Caută locație, titlu sau cuvânt cheie..."
          value={filters.keyword}
          onChange={handleInputChange}
          onKeyDown={handleLocatieKeyDown}
          className="w-full h-[48px] px-4 border border-gray-300 dark:border-zinc-600 rounded-full bg-white dark:bg-zinc-900 text-sm sm:text-base dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          role="combobox"
          aria-expanded={locatiiSugestii.length > 0}
          aria-controls="locatii-sugestii"
        />
        {locatiiSugestii.length > 0 && (
          <ul
            ref={dropdownRef}
            id="locatii-sugestii"
            className="absolute left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto"
            role="listbox"
          >
            {locatiiSugestii.map((locatie, idx) => (
              <li
                key={locatie}
                role="option"
                aria-selected={idx === sugestieIndex}
                onMouseDown={() => selectLocatie(locatie)}
                className={`px-4 py-2 text-sm cursor-pointer transition ${
                  idx === sugestieIndex
                    ? "bg-gray-100 dark:bg-zinc-700 font-medium"
                    : "hover:bg-gray-100 dark:hover:bg-zinc-700"
                }`}
              >
                {highlightMatch(locatie, filters.keyword)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TopSearchBar;
