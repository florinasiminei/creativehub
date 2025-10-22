"use client";

import React from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { IoClose } from "react-icons/io5";
import type { Filters, FacilityOption } from "@/lib/types";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

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
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-6 text-left align-middle shadow-xl transition-all relative">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                >
                  <IoClose className="w-6 h-6" />
                </button>

                <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-6">
                  Filtrează cazările
                </Dialog.Title>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Price Range */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">Interval preț</h3>
                    <Range
                      min={minPrice}
                      max={maxPrice}
                      value={[filters.pretMin, filters.pretMax]}
                      onChange={(values) => {
                        if (Array.isArray(values)) {
                          setFilters((prev) => ({
                            ...prev,
                            pretMin: values[0],
                            pretMax: values[1],
                          }));
                        }
                      }}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>{filters.pretMin} lei</span>
                      <span>{filters.pretMax} lei</span>
                    </div>
                  </div>

                  {/* Number of People */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">Număr persoane</h3>
                    <Range
                      min={persoaneRange.min}
                      max={persoaneRange.max}
                      value={[filters.persoaneMin, filters.persoaneMax]}
                      onChange={(values) => {
                        if (Array.isArray(values)) {
                          setFilters((prev) => ({
                            ...prev,
                            persoaneMin: values[0],
                            persoaneMax: values[1],
                          }));
                        }
                      }}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>{filters.persoaneMin} persoane</span>
                      <span>{filters.persoaneMax} persoane</span>
                    </div>
                  </div>

                  {/* Facilities - spans both columns */}
                  <div className="col-span-2 space-y-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">Facilități</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {facilitiesList.map((facility) => (
                        <label
                          key={facility.id}
                          className="flex items-center space-x-3"
                        >
                          <input
                            type="checkbox"
                            checked={filters.facilities.includes(facility.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters((prev) => ({
                                  ...prev,
                                  facilities: [...prev.facilities, facility.id],
                                }));
                              } else {
                                setFilters((prev) => ({
                                  ...prev,
                                  facilities: prev.facilities.filter(
                                    (id) => id !== facility.id
                                  ),
                                }));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {facility.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-between border-t pt-4 dark:border-zinc-700">
                  <button
                    type="button"
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                    onClick={resetFiltre}
                  >
                    Resetează toate
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-full border border-transparent bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Arată {resultsCount} rezultate
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SearchModal;