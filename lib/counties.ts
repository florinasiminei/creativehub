import fs from "fs";
import path from "path";
import { slugify } from "./utils";

export type CountyDefinition = {
  name: string;
  slug: string;
};

let cachedCounties: CountyDefinition[] | null = null;
const FALLBACK_COUNTIES = [
  "Alba",
  "Arad",
  "Arges",
  "Bacau",
  "Bihor",
  "Bistrita-Nasaud",
  "Botosani",
  "Braila",
  "Brasov",
  "Bucuresti",
  "Buzau",
  "Calarasi",
  "Caras-Severin",
  "Cluj",
  "Constanta",
  "Covasna",
  "Dambovita",
  "Dolj",
  "Galati",
  "Giurgiu",
  "Gorj",
  "Harghita",
  "Hunedoara",
  "Ialomita",
  "Iasi",
  "Ilfov",
  "Maramures",
  "Mehedinti",
  "Mures",
  "Neamt",
  "Olt",
  "Prahova",
  "Salaj",
  "Satu Mare",
  "Sibiu",
  "Suceava",
  "Teleorman",
  "Timis",
  "Tulcea",
  "Valcea",
  "Vaslui",
  "Vrancea",
];

function sortAndMapCounties(names: string[]): CountyDefinition[] {
  return names
    .map((name) => ({ name, slug: slugify(name) }))
    .sort((a, b) => a.name.localeCompare(b.name, "ro"));
}

function loadCounties(): CountyDefinition[] {
  if (cachedCounties) return cachedCounties;
  const filePath = path.join(process.cwd(), "public", "data", "ro-orase-dupa-judet.min.json");
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    cachedCounties = sortAndMapCounties(Object.keys(data));
    return cachedCounties;
  } catch {
    cachedCounties = sortAndMapCounties(FALLBACK_COUNTIES);
  }
  return cachedCounties;
}

export function getCounties(): CountyDefinition[] {
  return loadCounties();
}

export function findCountyBySlug(slug: string): CountyDefinition | undefined {
  return loadCounties().find((county) => county.slug === slug);
}
