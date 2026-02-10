"use client";

import { AiOutlineSearch } from "react-icons/ai";
import { IoClose } from "react-icons/io5";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function SimpleTopSearchInput({
  value,
  onChange,
  placeholder = "Cauta...",
  className = "",
}: Props) {
  return (
    <div className={`relative ${className}`}>
      <AiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transform text-xl text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[48px] w-full rounded-full border border-gray-300 bg-white pl-12 pr-12 text-sm transition-all duration-200 hover:border-emerald-400 hover:ring hover:ring-emerald-300 focus:border-emerald-400 focus:outline-none focus:ring focus:ring-emerald-300 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 transform rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-700"
          aria-label="Clear search"
        >
          <IoClose className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
