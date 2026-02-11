export type RegionType = "touristic" | "metro";

export type RegionDefinition = {
  name: string;
  slug: string;
  type: RegionType;
  counties: string[];
  coreCities?: string[];
  priority?: number;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stripParen = (value: string) => value.replace(/\s*\(.*?\)\s*/g, " ").trim();

export const metroRegions: RegionDefinition[] = [
  { name: "Zona metropolitană Alba Iulia", slug: "alba-iulia", type: "metro", counties: ["Alba"], coreCities: ["Alba Iulia"] },
  { name: "Zona metropolitană Bacău", slug: "bacau", type: "metro", counties: ["Bacău"], coreCities: ["Bacău"] },
  { name: "Zona metropolitană Baia Mare", slug: "baia-mare", type: "metro", counties: ["Maramureș"], coreCities: ["Baia Mare"] },
  { name: "Zona metropolitană Botoșani", slug: "botosani", type: "metro", counties: ["Botoșani"], coreCities: ["Botoșani"] },
  { name: "Zona metropolitană Brașov", slug: "brasov", type: "metro", counties: ["Brașov"], coreCities: ["Brașov"] },
  { name: "Zona metropolitană București", slug: "bucuresti", type: "metro", counties: ["București", "Ilfov"], coreCities: ["București"] },
  { name: "Zona metropolitană Cluj-Napoca", slug: "cluj-napoca", type: "metro", counties: ["Cluj"], coreCities: ["Cluj-Napoca"] },
  { name: "Zona metropolitană Constanța", slug: "constanta", type: "metro", counties: ["Constanța"], coreCities: ["Constanța"] },
  { name: "Zona metropolitană Deva-Hunedoara", slug: "deva-hunedoara", type: "metro", counties: ["Hunedoara"], coreCities: ["Deva", "Hunedoara"] },
  { name: "Zona metropolitană Craiova", slug: "craiova", type: "metro", counties: ["Dolj"], coreCities: ["Craiova"] },
  { name: "Zona metropolitană Drobeta-Turnu Severin", slug: "drobeta-turnu-severin", type: "metro", counties: ["Mehedinți"], coreCities: ["Drobeta-Turnu Severin"] },
  { name: "Zona metropolitană Iași", slug: "iasi", type: "metro", counties: ["Iași"], coreCities: ["Iași"] },
  { name: "Zona metropolitană Oradea", slug: "oradea", type: "metro", counties: ["Bihor"], coreCities: ["Oradea"] },
  { name: "Zona metropolitană Piatra Neamț", slug: "piatra-neamt", type: "metro", counties: ["Neamț"], coreCities: ["Piatra Neamț"] },
  { name: "Zona metropolitană Pitești", slug: "pitesti", type: "metro", counties: ["Argeș"], coreCities: ["Pitești"] },
  { name: "Zona metropolitană Ploiești", slug: "ploiesti", type: "metro", counties: ["Prahova"], coreCities: ["Ploiești"] },
  { name: "Zona metropolitană Râmnicu Vâlcea", slug: "ramnicu-valcea", type: "metro", counties: ["Vâlcea"], coreCities: ["Râmnicu Vâlcea"] },
  { name: "Zona metropolitană Reșița", slug: "resita", type: "metro", counties: ["Caraș-Severin"], coreCities: ["Reșița"] },
  { name: "Zona metropolitană Roman", slug: "roman", type: "metro", counties: ["Neamț"], coreCities: ["Roman"] },
  { name: "Zona metropolitană Satu Mare", slug: "satu-mare", type: "metro", counties: ["Satu Mare"], coreCities: ["Satu Mare"] },
  { name: "Zona metropolitană Suceava", slug: "suceava", type: "metro", counties: ["Suceava"], coreCities: ["Suceava"] },
  { name: "Zona metropolitană Târgu Mureș", slug: "targu-mures", type: "metro", counties: ["Mureș"], coreCities: ["Târgu Mureș"] },
  { name: "Zona metropolitană Timișoara", slug: "timisoara", type: "metro", counties: ["Timiș"], coreCities: ["Timișoara"] },
  { name: "Zona metropolitană Vaslui", slug: "vaslui", type: "metro", counties: ["Vaslui"], coreCities: ["Vaslui"] },
  { name: "Zona metropolitană Zalău", slug: "zalau", type: "metro", counties: ["Sălaj"], coreCities: ["Zalău"] },
];

export const touristRegions: RegionDefinition[] = [
  { name: "Delta Dunării", slug: "delta-dunarii", type: "touristic", counties: ["Tulcea"], priority: 100 },
  { name: "Retezat", slug: "retezat", type: "touristic", counties: ["Hunedoara"], priority: 90 },
  { name: "Țara Făgărașului", slug: "tara-fagarasului", type: "touristic", counties: ["Brașov", "Sibiu"], priority: 90 },
  { name: "Mărginimea Sibiului", slug: "marginimea-sibiului", type: "touristic", counties: ["Sibiu"], priority: 90 },
  { name: "Ținutul Pădurenilor", slug: "tinutul-padurenilor", type: "touristic", counties: ["Hunedoara"], priority: 90 },
  { name: "Harghita & Covasna", slug: "harghita-covasna", type: "touristic", counties: ["Harghita", "Covasna"], priority: 80 },
  { name: "Apuseni", slug: "apuseni", type: "touristic", counties: ["Alba", "Arad", "Bihor", "Cluj", "Hunedoara"], priority: 80 },
  { name: "Maramureș", slug: "maramures", type: "touristic", counties: ["Maramureș", "Satu Mare"], priority: 80 },
  { name: "Bucovina", slug: "bucovina", type: "touristic", counties: ["Suceava", "Botoșani"], priority: 80 },
  { name: "Banat", slug: "banat", type: "touristic", counties: ["Timiș", "Caraș-Severin", "Arad"], priority: 70 },
  { name: "Crișana", slug: "crisana", type: "touristic", counties: ["Bihor", "Arad", "Sălaj", "Satu Mare"], priority: 70 },
  { name: "Dobrogea", slug: "dobrogea", type: "touristic", counties: ["Constanța", "Tulcea"], priority: 70 },
  { name: "Muntenia", slug: "muntenia", type: "touristic", counties: ["Argeș", "Buzău", "Călărași", "Dâmbovița", "Giurgiu", "Ialomița", "Ilfov", "Prahova", "Teleorman", "București"], priority: 70 },
  { name: "Oltenia", slug: "oltenia", type: "touristic", counties: ["Dolj", "Gorj", "Mehedinți", "Olt", "Vâlcea"], priority: 70 },
  { name: "Moldova", slug: "moldova", type: "touristic", counties: ["Bacău", "Botoșani", "Galați", "Iași", "Neamț", "Suceava", "Vaslui", "Vrancea"], priority: 70 },
  { name: "Transilvania rurală", slug: "transilvania-rurala", type: "touristic", counties: ["Alba", "Brașov", "Cluj", "Hunedoara", "Mureș", "Sibiu"], priority: 10 },
];

export const allRegions: RegionDefinition[] = [...metroRegions, ...touristRegions];
export const regionSlugs = allRegions.map((region) => region.slug);

const normalizedMetro = metroRegions.map((region) => ({
  region,
  counties: region.counties.map(normalizeText),
  coreCities: (region.coreCities || []).map((city) => normalizeText(stripParen(city))),
}));

const normalizedTouristic = touristRegions.map((region) => ({
  region,
  counties: region.counties.map(normalizeText),
}));

export const findRegionBySlug = (slug: string) =>
  allRegions.find((region) => region.slug === slug);

export const parseLocationLabel = (value: string) => {
  const parts = String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { city: "", county: "" };
  if (parts.length === 1) return { city: stripParen(parts[0]), county: "" };
  return { city: stripParen(parts[0]), county: parts[parts.length - 1] };
};

export const resolveRegionForLocation = (city?: string, county?: string) => {
  const normCity = normalizeText(stripParen(String(city || "")));
  const normCounty = normalizeText(String(county || ""));

  if (normCity) {
    const metroMatch = normalizedMetro.find((item) =>
      item.coreCities.includes(normCity)
    );
    if (metroMatch) return metroMatch.region;
  }

  if (normCounty) {
    const candidates = normalizedTouristic.filter((item) =>
      item.counties.includes(normCounty)
    );
    if (candidates.length === 0) return null;
    const sorted = [...candidates].sort(
      (a, b) => (b.region.priority || 0) - (a.region.priority || 0)
    );
    return sorted[0].region;
  }

  return null;
};

export const metroCoreCitySet = new Set(
  metroRegions.flatMap((region) =>
    (region.coreCities || []).map((city) => normalizeText(stripParen(city)))
  )
);

export const normalizeRegionText = normalizeText;
