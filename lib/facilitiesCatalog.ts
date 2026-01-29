type FacilityLike = {
  name: string;
};

const removeDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeFacilityLabel = (value: string) =>
  removeDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s/+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const CORE_FACILITY_LABELS = [
  "Wi-Fi",
  "Parcare",
  "Bucătărie / Chicinetă",
  "Aer condiționat",
  "Încălzire",
  "TV / Smart TV",
  "Mașină de spălat rufe",
  "Uscător de rufe",
  "Terasă / Balcon",
  "Grătar / BBQ",
  "Șemineu / Sobă",
  "Piscină",
  "Ciubăr / Jacuzzi",
  "Saună",
  "Pet friendly",
  "Mic dejun inclus",
];

const coreRank = new Map(
  CORE_FACILITY_LABELS.map((label, index) => [normalizeFacilityLabel(label), index]),
);

export const sortFacilitiesByPriority = <T extends FacilityLike>(facilities: T[]) => {
  return [...facilities].sort((a, b) => {
    const rankA = coreRank.get(normalizeFacilityLabel(a.name));
    const rankB = coreRank.get(normalizeFacilityLabel(b.name));
    if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;
    return a.name.localeCompare(b.name, "ro", { sensitivity: "base" });
  });
};
