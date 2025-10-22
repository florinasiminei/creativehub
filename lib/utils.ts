// lib/utils.ts

// Types
import type { Filters } from "./types";

export function getInitialFilters(cazari: Cazare[]): Filters {
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

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function classNames(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

export function isActiveLink(pathname: string, hash: string, href: string) {
  if (href.startsWith("/")) return pathname === href;
  if (href.startsWith("#")) return hash === href && pathname === "/";
  return false;
}

export function highlightMatch(text: string, query: string) {
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

export type Cazare = {
  id: string;
  title: string;
  slug: string;
  price: number;
  tip: string;
  locatie: string;
  numarPersoane: number;
  facilities: string[];
  facilitiesNames: string[];
  image: string;
  phone?: string;
};
