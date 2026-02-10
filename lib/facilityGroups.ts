import { normalizeFacilityName } from "@/lib/facilityIcons";

type FacilityLike = {
  id: string;
  name: string;
};

type FacilityGroupDefinition = {
  key: string;
  label: string;
  keywords: string[];
};

export type GroupedFacilities<T extends FacilityLike> = {
  key: string;
  label: string;
  facilities: T[];
};

const FACILITY_GROUPS: FacilityGroupDefinition[] = [
  {
    key: "confort",
    label: "Confort",
    keywords: [
      "wifi",
      "wi fi",
      "tv",
      "smart tv",
      "aer conditionat",
      "incalzire",
      "bucatarie",
      "chicineta",
      "masina de spalat",
      "uscator",
      "parcare",
      "spatiu de lucru",
      "birou",
    ],
  },
  {
    key: "relaxare",
    label: "Relaxare",
    keywords: ["piscina", "ciubar", "jacuzzi", "sauna", "zona de relaxare", "semineu", "soba", "firepit", "hamac"],
  },
  {
    key: "exterior",
    label: "Exterior si peisaj",
    keywords: [
      "gradina",
      "terasa",
      "balcon",
      "foisor",
      "gratar",
      "bbq",
      "vedere la munte",
      "la munte",
      "priveliste",
      "langa apa",
    ],
  },
  {
    key: "familie",
    label: "Familie si animale",
    keywords: ["child friendly", "family friendly", "copii", "pet friendly", "animale permise", "accepta animale"],
  },
  {
    key: "servicii",
    label: "Servicii",
    keywords: ["mic dejun", "breakfast", "brunch"],
  },
];

const OTHER_FACILITIES_GROUP: Omit<GroupedFacilities<FacilityLike>, "facilities"> = {
  key: "altele",
  label: "Alte facilitati",
};

const groupedMatchers = FACILITY_GROUPS.map((group) => ({
  ...group,
  normalizedKeywords: group.keywords
    .map((keyword) => normalizeFacilityName(keyword))
    .filter((keyword) => keyword.length > 0),
}));

export const groupFacilitiesByCategory = <T extends FacilityLike>(facilities: T[]): GroupedFacilities<T>[] => {
  const groups = FACILITY_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    facilities: [] as T[],
  }));
  const fallbackGroup: GroupedFacilities<T> = { ...OTHER_FACILITIES_GROUP, facilities: [] as T[] };

  facilities.forEach((facility) => {
    const normalizedName = normalizeFacilityName(facility.name);
    const matchedGroup = groupedMatchers.find((group) =>
      group.normalizedKeywords.some((keyword) => normalizedName.includes(keyword))
    );

    if (!matchedGroup) {
      fallbackGroup.facilities.push(facility);
      return;
    }

    const targetGroup = groups.find((group) => group.key === matchedGroup.key);
    if (!targetGroup) {
      fallbackGroup.facilities.push(facility);
      return;
    }

    targetGroup.facilities.push(facility);
  });

  const populatedGroups = groups.filter((group) => group.facilities.length > 0);
  if (fallbackGroup.facilities.length > 0) {
    populatedGroups.push(fallbackGroup);
  }
  return populatedGroups;
};
