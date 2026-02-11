import { findCountyBySlug } from "@/lib/counties";
type AnyRow = Record<string, unknown>;

export type SeoPageStatus = "publicata" | "nepublicata" | "draft";

export type SeoToggleMeta = {
  publishField: string | null;
  indexMode: "indexable" | "noindex" | null;
  indexField: string | null;
};

function pickString(row: AnyRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickBoolean(row: AnyRow, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
      if (normalized === "false" || normalized === "0" || normalized === "no") return false;
    }
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
    }
  }
  return null;
}

function pickDateMs(row: AnyRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (!value) continue;
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }
  return null;
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripQueryAndHash(path: string): string {
  return path.split("#")[0].split("?")[0];
}

function normalizeSeoPath(path: string): string {
  let pathname = "/";
  try {
    const parsed = new URL(path, "https://cabn.local");
    pathname = parsed.pathname || "/";
  } catch {
    pathname = stripQueryAndHash(path);
  }

  pathname = stripQueryAndHash(pathname).trim();
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  pathname = pathname.replace(/\/{2,}/g, "/").toLowerCase();
  pathname = pathname
    .replace(/^\/judete\//, "/judet/")
    .replace(/^\/judetul\//, "/judet/")
    .replace(/^\/regiuni\//, "/regiune/");

  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);

  const judetMatch = pathname.match(/^\/judet\/([^/]+)$/);
  if (judetMatch?.[1]) {
    const county = findCountyBySlug(decodeSafe(judetMatch[1]));
    if (county) pathname = `/judet/${county.slug}`;
  }

  return pathname || "/";
}

function inferPathFromType(row: AnyRow, type: string | null, slug: string | null): string | null {
  const normalizedType = (type || "").toLowerCase();
  if (normalizedType === "judet" || normalizedType === "county") {
    const countyFromName = findCountyBySlug(pickString(row, ["name", "title", "label", "county_name"]) || "");
    const countyFromSlug = findCountyBySlug(slug || "");
    const resolvedSlug = countyFromName?.slug || countyFromSlug?.slug || slug;
    if (!resolvedSlug) return null;
    return `/judet/${resolvedSlug}`;
  }
  if (!slug) return null;
  if (normalizedType === "regiune" || normalizedType === "region") return `/regiune/${slug}`;
  if (normalizedType === "tip" || normalizedType === "type") return `/cazari/${slug}`;
  return `/${slug}`;
}

export function getSeoToggleMeta(row: AnyRow): SeoToggleMeta {
  const publishField =
    ["is_published", "published", "is_active", "active", "visible"]
      .find((key) => Object.prototype.hasOwnProperty.call(row, key)) || null;

  const indexableField =
    ["is_indexable", "indexable", "allow_indexing"]
      .find((key) => Object.prototype.hasOwnProperty.call(row, key)) || null;
  if (indexableField) {
    return { publishField, indexMode: "indexable", indexField: indexableField };
  }

  const noindexField =
    ["noindex", "is_noindex", "robots_noindex"]
      .find((key) => Object.prototype.hasOwnProperty.call(row, key)) || null;
  if (noindexField) {
    return { publishField, indexMode: "noindex", indexField: noindexField };
  }

  return { publishField, indexMode: null, indexField: null };
}

export function getSeoPageTitle(row: AnyRow): string {
  return (
    pickString(row, ["title", "name", "label"]) ||
    pickString(row, ["slug"]) ||
    "Pagina fara titlu"
  );
}

export function getSeoPageSlug(row: AnyRow): string {
  return pickString(row, ["slug", "path", "url"]) || "-";
}

export function getSeoPageAuthor(row: AnyRow): string | null {
  return pickString(row, ["updated_by", "author", "created_by", "owner"]);
}

export function getSeoMenuVisibility(row: AnyRow): boolean {
  const menuVisible = pickBoolean(row, [
    "show_in_menu",
    "in_menu",
    "is_visible_in_menu",
    "visible_in_menu",
    "menu_visible",
  ]);
  return menuVisible ?? false;
}

export function getSeoIndexable(row: AnyRow): boolean {
  const indexable = pickBoolean(row, ["is_indexable", "indexable", "allow_indexing"]);
  if (indexable !== null) return indexable;

  const noindex = pickBoolean(row, ["noindex", "is_noindex", "robots_noindex"]);
  if (noindex !== null) return !noindex;

  return true;
}

export function getSeoPageStatus(row: AnyRow): SeoPageStatus {
  const statusRaw = pickString(row, ["status", "page_status"]);
  if (statusRaw) {
    const normalized = statusRaw.toLowerCase();
    if (normalized.includes("draft")) return "draft";
    if (normalized.includes("public")) return "publicata";
    if (normalized.includes("inactiv") || normalized.includes("nepublic")) return "nepublicata";
  }

  const isPublished = pickBoolean(row, ["is_published", "published", "is_active", "active"]);
  return isPublished ? "publicata" : "nepublicata";
}

export function getSeoPageLastModifiedMs(row: AnyRow): number | null {
  return pickDateMs(row, [
    "updated_at",
    "updatedAt",
    "modified_at",
    "last_modified",
    "created_at",
  ]);
}

export function getSeoPageUrl(row: AnyRow): string | null {
  const directPath = pickString(row, ["path", "url", "canonical_path", "page_path"]);
  if (directPath) {
    if (directPath.startsWith("http://") || directPath.startsWith("https://")) {
      try {
        const parsed = new URL(directPath);
        return normalizeSeoPath(parsed.pathname || "/");
      } catch {
        return normalizeSeoPath(directPath);
      }
    }
    return normalizeSeoPath(directPath);
  }

  const type = pickString(row, ["type", "zone_type"]);
  const slug = pickString(row, ["slug"]);
  const inferred = inferPathFromType(row, type, slug);
  return inferred ? normalizeSeoPath(inferred) : null;
}
