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

function normalizeCountySlugInput(input: string): string {
  const normalized = slugify(String(input || "").trim());
  return normalized
    .replace(/^\/+/, "")
    .replace(/^judetul-+/, "")
    .replace(/^judet-+/, "")
    .replace(/^county-+/, "")
    .replace(/-+judetul$/, "")
    .replace(/-+judet$/, "");
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[b.length];
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
  const counties = loadCounties();
  const normalized = normalizeCountySlugInput(slug);
  if (!normalized) return undefined;

  const direct = counties.find((county) => county.slug === normalized);
  if (direct) return direct;

  // Handle common legacy typos/transliteration artifacts like "braov" -> "brasov".
  let best: CountyDefinition | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  let ties = 0;
  for (const county of counties) {
    const distance = levenshteinDistance(normalized, county.slug);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = county;
      ties = 1;
    } else if (distance === bestDistance) {
      ties += 1;
    }
  }

  if (best && bestDistance <= 1 && ties === 1) return best;
  return undefined;
}
