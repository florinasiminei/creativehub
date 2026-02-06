import fs from "fs";
import path from "path";
import { slugify } from "./utils";

export type CountyDefinition = {
  name: string;
  slug: string;
};

let cachedCounties: CountyDefinition[] | null = null;

function loadCounties(): CountyDefinition[] {
  if (cachedCounties) return cachedCounties;
  const filePath = path.join(process.cwd(), "public", "data", "ro-orase-dupa-judet.min.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as Record<string, unknown>;
  cachedCounties = Object.keys(data)
    .map((name) => ({ name, slug: slugify(name) }))
    .sort((a, b) => a.name.localeCompare(b.name, "ro"));
  return cachedCounties;
}

export function getCounties(): CountyDefinition[] {
  return loadCounties();
}

export function findCountyBySlug(slug: string): CountyDefinition | undefined {
  return loadCounties().find((county) => county.slug === slug);
}
