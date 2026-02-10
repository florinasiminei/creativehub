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
  WashingMachine,
  Fan,
  PawPrint,
  Coffee,
  Sparkles,
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
  { pattern: /masina de spalat|spalat rufe|washing machine|washer/u, icon: <WashingMachine size={20} /> },
  { pattern: /uscator|dryer|drying/u, icon: <Fan size={20} /> },
  { pattern: /semineu|fireplace|firepit|soba/u, icon: <Flame size={20} /> },
  { pattern: /sauna|spa/u, icon: <Sparkles size={20} /> },
  { pattern: /child friendly|family friendly|copii|famil/i, icon: <Users size={20} /> },
  { pattern: /gradina|curte/u, icon: <SunMedium size={20} /> },
  { pattern: /vedere la munte|la munte|munte|mountain/u, icon: <MapPin size={20} /> },
  { pattern: /zona de relaxare|relaxare|relax|lounge/u, icon: <Sparkles size={20} /> },
  { pattern: /pet friendly|animale|animal|dog|cat/u, icon: <PawPrint size={20} /> },
  { pattern: /mic dejun|breakfast|brunch/u, icon: <Coffee size={20} /> },
  { pattern: /dormitor|pat|bed|camera de dormit/u, icon: <Bed size={20} /> },
  { pattern: /baie|dus|toaleta|sanitar/u, icon: <Bath size={20} /> },
  { pattern: /capacitate|persoane|locuri/u, icon: <Users size={20} /> },
  { pattern: /harta|mapa|gps|localizare/u, icon: <MapPin size={20} /> },
  { pattern: /terasa|balcon|foisor|veranda/u, icon: <SunMedium size={20} /> },
];

export const resolveFacilityIcon = (name: unknown) => {
  const normalized = normalizeFacilityName(name);
  const match = facilityIconMatchers.find(({ pattern }) => pattern.test(normalized));
  return match?.icon ?? <Users size={20} />;
};

