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

function inferPathFromType(type: string | null, slug: string | null): string | null {
  if (!slug) return null;
  const normalizedType = (type || "").toLowerCase();
  if (normalizedType === "judet" || normalizedType === "county") return `/judet/${slug}`;
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
        return parsed.pathname || "/";
      } catch {
        return directPath;
      }
    }
    return directPath.startsWith("/") ? directPath : `/${directPath}`;
  }

  const type = pickString(row, ["type", "zone_type"]);
  const slug = pickString(row, ["slug"]);
  return inferPathFromType(type, slug);
}
