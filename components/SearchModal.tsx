"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { IoClose } from "react-icons/io5";
import type { Filters, FacilityOption } from "@/lib/types";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { ChevronDown } from "lucide-react";
import { resolveFacilityIcon, normalizeFacilityName } from "@/lib/facilityIcons";

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  minPrice: number;
  maxPrice: number;
  persoaneRange: { min: number; max: number };
  resetFiltre: () => void;
  facilitiesList: FacilityOption[];
  resultsCount?: number;
};

const Range = Slider.Range;
const MAX_COUNTER_VALUE = 16;
type CounterKey = "camere" | "paturi" | "bai";

const FACILITY_CATEGORIES: Array<{ label: string; keys: string[] }> = [
  {
    label: "Relaxare",
    keys: ["ciubar", "sauna", "piscina", "semineu", "firepit", "hamac"],
  },
  {
    label: "Exterior",
    keys: ["bbq", "gratar", "terasa", "foisor"],
  },
  {
    label: "Interior",
    keys: ["bucatarie", "aer conditionat", "tv", "uscator de par", "masina de spalat"],
  },
  {
    label: "Digital",
    keys: ["wifi", "spatiu de lucru dedicat", "birou", "wi-fi"],
  },
  {
    label: "Animale",
    keys: ["accepta animale", "pet friendly", "animale permise"],
  },
  {
    label: "Peisaj",
    keys: ["priveliste", "langa apa", "la munte"],
  },
];

const counterConfig: Array<{ key: CounterKey; label: string }> = [
  { key: "camere", label: "Camere" },
  { key: "paturi", label: "Paturi" },
  { key: "bai", label: "Bai" },
];

const formatCounterSubtitle = (value: number) => {
  if (value === 0) return "Oricate";
  if (value >= MAX_COUNTER_VALUE) return `${MAX_COUNTER_VALUE}+`;
  return `${value}+`;
};

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  minPrice,
  maxPrice,
  persoaneRange,
  resetFiltre,
  facilitiesList,
  resultsCount,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const root = document.documentElement;
    const updateMode = () => setIsDarkMode(root.classList.contains("dark"));
    updateMode();
    const observer = new MutationObserver(updateMode);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const updateCounter = (key: CounterKey, delta: 1 | -1) => {
    setFilters((prev) => {
      const current = prev[key];
      const next = delta === 1 ? Math.min(current + 1, MAX_COUNTER_VALUE) : Math.max(current - 1, 0);
      if (next === current) return prev;
      return { ...prev, [key]: next };
    });
  };

  const [priceDraft, setPriceDraft] = useState<[number, number]>([filters.pretMin, filters.pretMax]);
  const [peopleDraft, setPeopleDraft] = useState<[number, number]>([filters.persoaneMin, filters.persoaneMax]);

  useEffect(() => {
    setPriceDraft([filters.pretMin, filters.pretMax]);
  }, [filters.pretMin, filters.pretMax]);

  useEffect(() => {
    setPeopleDraft([filters.persoaneMin, filters.persoaneMax]);
  }, [filters.persoaneMin, filters.persoaneMax]);

  const handleStyles = useMemo(() => {
    const baseStyle = {
      width: 22,
      height: 22,
      borderColor: "#10B981",
      borderWidth: 1,
      backgroundColor: isDarkMode ? "#18181b" : "#FFFFFF",
      boxShadow: "0 4px 10px rgba(16, 185, 129, 0.35)",
      marginTop: -10,
    };

    return [{ ...baseStyle }, { ...baseStyle }];
  }, [isDarkMode]);

  const categorizedFacilities = useMemo(() => {
    if (!facilitiesList.length) return [];

    const lookup = new Map<string, FacilityOption[]>();
    facilitiesList.forEach((facility) => {
      const key = normalizeFacilityName(facility.name);
      if (!lookup.has(key)) lookup.set(key, []);
      lookup.get(key)!.push(facility);
    });

    const used = new Set<string>();
    const groups: Array<{ label: string; facilities: FacilityOption[] }> = [];

    FACILITY_CATEGORIES.forEach(({ label, keys }) => {
      const entries: FacilityOption[] = [];
      keys.forEach((raw) => {
        const key = normalizeFacilityName(raw);
        lookup.get(key)?.forEach((facility) => {
          if (!used.has(facility.id)) {
            entries.push(facility);
            used.add(facility.id);
          }
        });
      });
      if (entries.length > 0) {
        groups.push({ label, facilities: entries });
      }
    });

    const leftovers = facilitiesList.filter((facility) => !used.has(facility.id));
    if (leftovers.length > 0) {
      groups.push({ label: "Alte facilitati", facilities: leftovers });
    }

    return groups;
  }, [facilitiesList]);

  const toggleFacility = (id: string) => {
    setFilters((prev) => {
      const selected = prev.facilities.includes(id);
      return {
        ...prev,
        facilities: selected ? prev.facilities.filter((fid) => fid !== id) : [...prev.facilities, id],
      };
    });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="duration-90 ease-out"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="duration-75 ease-in"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/35 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
          <Transition.Child
            as={Fragment}
            enter="duration-100 ease-out"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="duration-90 ease-in-out"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Panel
              className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-opacity duration-90 dark:bg-zinc-900"
            >
              <div className="relative z-20 border-b border-gray-200/70 bg-white/95 px-5 pb-4 pt-6 backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/95">
                <div className="relative flex items-center justify-center">
                  <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                    Filtreaza cazarile
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="absolute right-0 top-1 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-zinc-800 dark:hover:text-gray-300"
                    aria-label="Inchide filtre"
                  >
                    <IoClose className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div
                className="relative flex-1 overflow-y-auto overscroll-contain px-6 pb-6"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="space-y-6 pt-5">
                  <div className="rounded-2xl">
                    <div className="p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-white">
                        Interval pret
                      </h3>
                      <div className="mt-4">
                        <Range
                            min={minPrice}
                            max={maxPrice}
                            value={priceDraft}
                            onChange={(values) => {
                              if (Array.isArray(values)) {
                                setPriceDraft([values[0], values[1]]);
                              }
                            }}
                            onAfterChange={(values) => {
                              if (Array.isArray(values)) {
                                setFilters((prev) => ({
                                  ...prev,
                                  pretMin: values[0],
                                  pretMax: values[1],
                                }));
                              }
                            }}
                            className="mt-2"
                            handleStyle={[{ ...handleStyles[0] }, { ...handleStyles[1] }]}
                            trackStyle={[{ backgroundColor: "#10B981" }]}
                            railStyle={{ backgroundColor: "#e5e7eb" }}
                            allowCross={false}
                          />
                          <div className="mt-3 flex justify-between text-sm font-medium text-gray-600 dark:text-gray-300">
                          <span>{priceDraft[0]} lei</span>
                          <span>{priceDraft[1]} lei</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-white">
                        Numar persoane
                      </h3>
                      <div className="mt-4">
                        <Range
                            min={persoaneRange.min}
                            max={persoaneRange.max}
                            value={peopleDraft}
                            onChange={(values) => {
                              if (Array.isArray(values)) {
                                setPeopleDraft([values[0], values[1]]);
                              }
                            }}
                            onAfterChange={(values) => {
                              if (Array.isArray(values)) {
                                setFilters((prev) => ({
                                  ...prev,
                                  persoaneMin: values[0],
                                  persoaneMax: values[1],
                                }));
                              }
                            }}
                            className="mt-2"
                            handleStyle={[{ ...handleStyles[0] }, { ...handleStyles[1] }]}
                            trackStyle={[{ backgroundColor: "#10B981" }]}
                            railStyle={{ backgroundColor: "#e5e7eb" }}
                            allowCross={false}
                          />
                          <div className="mt-3 flex justify-between text-sm font-medium text-gray-600 dark:text-gray-300">
                          <span>{peopleDraft[0]} persoane</span>
                          <span>{peopleDraft[1]} persoane</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Camere si paturi</h3>
                      <div className="space-y-1.5 border-b border-gray-200 pb-3 dark:border-zinc-800">
                        {counterConfig.map(({ key, label }) => {
                          const value = filters[key];
                          const displayValue = formatCounterSubtitle(value);
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between px-2 py-2"
                            >
                              <span className="font-medium text-gray-900 dark:text-white">{label}</span>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => updateCounter(key, -1)}
                                  disabled={value === 0}
                                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-xl text-gray-600 transition hover:border-gray-400 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-gray-300 dark:hover:border-zinc-500"
                                  aria-label={`Scade ${label.toLowerCase()}`}
                                >
                                  -
                                </button>
                                <span className="w-14 text-center text-base font-semibold text-gray-900 dark:text-white">
                                  {displayValue}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCounter(key, 1)}
                                  disabled={value >= MAX_COUNTER_VALUE}
                                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-xl text-gray-600 transition hover:border-gray-400 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-gray-300 dark:hover:border-zinc-500"
                                  aria-label={`Creste ${label.toLowerCase()}`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Facilitati</h3>
                      <div className="mt-0.5 space-y-0">
                        {categorizedFacilities.map((category) => (
                          <div key={category.label} className="rounded-2xl p-4">
                            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              {category.label}
                            </span>
                            <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
                              {category.facilities.map((facility) => {
                                const selected = filters.facilities.includes(facility.id);
                                return (
                                  <button
                                    key={facility.id}
                                    type="button"
                                    onClick={() => toggleFacility(facility.id)}
                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                                      selected
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-200"
                                        : "border-gray-200 text-gray-700 hover:border-emerald-300 hover:text-emerald-600 dark:border-zinc-700 dark:text-gray-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
                                    }`}
                                    aria-pressed={selected}
                                  >
                                    <span className="flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                                      {resolveFacilityIcon(facility.name)}
                                    </span>
                                    <span>{facility.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 px-6 py-4 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                      onClick={resetFiltre}
                    >
                      Reseteaza toate
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-full border border-transparent bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                      onClick={onClose}
                    >
                      Arata {resultsCount} rezultate
                    </button>
                  </div>
                </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SearchModal;

