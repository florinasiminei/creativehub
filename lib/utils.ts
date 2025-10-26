// lib/utils.ts
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

export type Cazare = {
  id: string;
  title: string;
  slug: string;
  price: number;
  tip: string;
  locatie: string;
  numarPersoane: number;
  camere: number;
  paturi: number;
  bai: number;
  facilities: string[];
  facilitiesNames: string[];
  image: string;
  phone?: string;
};
