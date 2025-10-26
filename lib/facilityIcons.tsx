"use client";

import {
  Bath,
  Bed,
  MapPin,
  ParkingSquare,
  Flame,
  Waves,
  CookingPot,
  Snowflake,
  ThermometerSun,
  Tv,
  Users,
  Wifi,
  Wind,
  Utensils,
  SunMedium,
} from "lucide-react";
import type { ReactNode } from "react";

export const normalizeFacilityName = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const facilityIconMatchers: Array<{ pattern: RegExp; icon: ReactNode }> = [
  { pattern: /wi[\s-]*fi|internet|wireless/u, icon: <Wifi size={20} /> },
  { pattern: /smart?\s*tv|televisor|televizor|tv/u, icon: <Tv size={20} /> },
  { pattern: /parcare|parking/u, icon: <ParkingSquare size={20} /> },
  { pattern: /gratar|bbq|barbeque|barbecue/u, icon: <CookingPot size={20} /> },
  { pattern: /bucatarie|kitchen|chicineta|microunde|aragaz/u, icon: <Utensils size={20} /> },
  { pattern: /aer\s*conditionat|clima|ac/u, icon: <Snowflake size={20} /> },
  { pattern: /piscina|hot\s*tub|jacuzzi|ciubar/u, icon: <Waves size={20} /> },
  { pattern: /incalzire|caldura|radiator|heat/u, icon: <ThermometerSun size={20} /> },
  { pattern: /ventilatie|ventilator/u, icon: <Wind size={20} /> },
  { pattern: /semineu|fireplace|firepit|soba/u, icon: <Flame size={20} /> },
  { pattern: /dormitor|pat|bed|camera de dormit/u, icon: <Bed size={20} /> },
  { pattern: /baie|dus|toaleta|sanitar/u, icon: <Bath size={20} /> },
  { pattern: /capacitate|persoane|locuri/u, icon: <Users size={20} /> },
  { pattern: /harta|mapa|gps|localizare/u, icon: <MapPin size={20} /> },
  { pattern: /terasa|foisor|veranda/u, icon: <SunMedium size={20} /> },
];

export const resolveFacilityIcon = (name: unknown) => {
  const normalized = normalizeFacilityName(name);
  const match = facilityIconMatchers.find(({ pattern }) => pattern.test(normalized));
  return match?.icon ?? <Users size={20} />;
};

