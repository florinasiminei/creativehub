const META_TITLE_MAX = 58;
const META_DESCRIPTION_MAX = 160;

function normalizeUnicode(value: string): string {
  return String(value ?? "").normalize("NFC");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeText(value: string): string {
  return collapseSpaces(stripHtml(normalizeUnicode(value)));
}

function clampMetaText(value: string, maxLength: number): string {
  const normalized = sanitizeText(value);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;

  const sliced = normalized.slice(0, maxLength - 1).trim();
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > Math.floor(maxLength * 0.6)) {
    return `${sliced.slice(0, lastSpace).trim()}…`;
  }
  return `${sliced}…`;
}

export function clampMetaTitle(value: string): string {
  return clampMetaText(value, META_TITLE_MAX);
}

export function clampMetaDescription(value: string): string {
  return clampMetaText(value, META_DESCRIPTION_MAX);
}

function withPreposition(scope?: string, preposition = "în"): string {
  const s = sanitizeText(scope ?? "");
  if (!s) return "";

  // Accept explicit leading prepositions from callers to avoid duplicate prefixes.
  if (/^(în|pe|din|la|de|cu)\s/i.test(s.toLowerCase())) return s;
  return `${preposition} ${s}`;
}

const A_FRAME_LABEL = "Cabane A‑Frame";

// H1/hero text: keep it expressive, without clamp.
export const SEO_COLLECTION_HEADLINE =
  "Cabane premium, tiny houses și retreat-uri în România";

// Meta-only title/description (clamped).
export const SEO_COLLECTION_META_TITLE = clampMetaTitle(
  "Cabane premium și retreat-uri autentice în România"
);

export const SEO_COLLECTION_DESCRIPTION = clampMetaDescription(
  "Descoperă o colecție selectată de cabane premium, tiny houses și retreat-uri autentice din România. Locații verificate și alese cu grijă pentru experiențe memorabile."
);

const SEO_TYPE_LABELS_BY_SLUG: Record<string, string> = {
  cabane: "Cabane premium",
  "a-frame": A_FRAME_LABEL,
  pensiuni: "Pensiuni premium",
  apartamente: "Apartamente premium",
  "tiny-house": "Tiny houses premium",
  "case-de-vacanta": "Case de vacanță premium",
};

export function getSeoTypeLabel(typeSlug: string, fallbackLabel: string): string {
  const slug = sanitizeText(typeSlug).toLowerCase();
  const fallback = sanitizeText(fallbackLabel);
  const mapped = SEO_TYPE_LABELS_BY_SLUG[slug];
  if (mapped) return mapped;
  if (fallback) return fallback;
  return "Cazări premium";
}

export function buildSeoCollectionTitle(scope?: string): string {
  const suffix = withPreposition(scope);
  return clampMetaTitle(`Cabane premium, tiny houses și retreat-uri ${suffix}`.trim());
}

const COLLECTION_DESCRIPTIONS = [
  (scopeTxt: string) =>
    `Explorează o selecție de cabane premium, tiny houses și retreat-uri autentice ${scopeTxt}. Toate locațiile sunt verificate și alese cu grijă pentru experiențe memorabile.`,
  (scopeTxt: string) =>
    `Descoperă colecții curatoriate de cabane premium, tiny houses și retreat-uri ${scopeTxt}, atent selectate pentru confort și atmosferă. Locații verificate, numai bune pentru escapade memorabile.`,
  (scopeTxt: string) =>
    `Alege dintre cabane premium, tiny houses și retreat-uri ${scopeTxt}, selectate cu grijă pentru experiențe autentice. Toate locațiile sunt verificate.`,
];

export function buildSeoCollectionDescription(scope?: string, variant = 0): string {
  const scopeTxt = withPreposition(scope);
  const pick = COLLECTION_DESCRIPTIONS[variant] || COLLECTION_DESCRIPTIONS[0];
  return clampMetaDescription(pick(scopeTxt));
}

export function buildSeoTypeTitle(typeLabel: string, scope?: string): string {
  const label = sanitizeText(typeLabel);
  const suffix = withPreposition(scope);
  return clampMetaTitle(`${label} ${suffix}`.trim());
}

const TYPE_DESCRIPTIONS = [
  (label: string, scopeTxt: string) =>
    `Descoperă ${label} ${scopeTxt}, atent selectate pentru confort, atmosferă și autenticitate. Alege din locații verificate, ideale pentru escapade memorabile.`,
  (label: string, scopeTxt: string) =>
    `Explorează ${label} ${scopeTxt}, selectate cu grijă pentru experiențe premium în natură. Toate locațiile sunt verificate.`,
  (label: string, scopeTxt: string) =>
    `Alege ${label} ${scopeTxt}, din colecția CABN – spații verificate și curatoriate pentru momente de neuitat.`,
];

export function buildSeoTypeDescription(typeLabel: string, scope?: string, variant = 0): string {
  const label = sanitizeText(typeLabel);
  const scopeTxt = withPreposition(scope);
  const pick = TYPE_DESCRIPTIONS[variant] || TYPE_DESCRIPTIONS[0];
  return clampMetaDescription(pick(label, scopeTxt));
}
