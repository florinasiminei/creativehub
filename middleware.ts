import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDraftAuthFromHeader, getRoleFromEncodedAuth } from "@/lib/draftsAuth";
import { LISTING_TYPES } from "@/lib/listingTypes";
import { metroRegions, touristRegions } from "@/lib/regions";
import { slugify } from "@/lib/utils";

const TYPE_SLUGS = new Set(LISTING_TYPES.map((type) => type.slug));
const SORTED_TYPE_SLUGS = Array.from(TYPE_SLUGS).sort((a, b) => b.length - a.length);
const METRO_REGION_SLUGS = new Set(metroRegions.map((region) => region.slug));
const TOURISTIC_REGION_SLUGS = new Set(touristRegions.map((region) => region.slug));

function toSlug(value: string): string {
  return slugify(String(value || "").trim());
}

function toCountySegment(value: string): string {
  const normalized = toSlug(value).replace(/^judet-+/, "");
  return normalized ? `judet-${normalized}` : "";
}

function toFacilitySegment(value: string): string {
  const normalized = toSlug(value).replace(/^cu-+/, "");
  return normalized ? `cu-${normalized}` : "";
}

function toTypeSlug(value: string): string {
  return toSlug(value);
}

function resolveLocationSegment(value: string): string {
  const normalized = toSlug(value);
  if (!normalized) return "";

  if (normalized.startsWith("judet-")) return toCountySegment(normalized);
  if (normalized.startsWith("localitate-")) {
    const regionSlug = normalized.slice("localitate-".length);
    if (TOURISTIC_REGION_SLUGS.has(regionSlug)) return `regiune-${regionSlug}`;
    return `localitate-${regionSlug}`;
  }
  if (normalized.startsWith("regiune-")) {
    const regionSlug = normalized.slice("regiune-".length);
    if (METRO_REGION_SLUGS.has(regionSlug)) return `localitate-${regionSlug}`;
    return `regiune-${regionSlug}`;
  }

  if (METRO_REGION_SLUGS.has(normalized)) return `localitate-${normalized}`;
  if (TOURISTIC_REGION_SLUGS.has(normalized)) return `regiune-${normalized}`;
  return toCountySegment(normalized);
}

function resolveLegacyTypeCountyPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const slug = toSlug(segments[0]);
  if (!slug) return null;

  for (const typeSlug of SORTED_TYPE_SLUGS) {
    const prefix = `${typeSlug}-`;
    if (!slug.startsWith(prefix) || slug.length <= prefix.length) continue;
    const countySlug = slug.slice(prefix.length);
    if (!countySlug) continue;
    return `/cazari/${typeSlug}/${toCountySegment(countySlug)}`;
  }

  return null;
}

function resolveLegacyRedirectPath(pathname: string): string | null {
  const typeCountyPath = resolveLegacyTypeCountyPath(pathname);
  if (typeCountyPath) return typeCountyPath;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  if (segments[0] === "regiune" && segments.length === 2) {
    const slug = toSlug(segments[1]);
    if (!slug) return null;
    if (METRO_REGION_SLUGS.has(slug)) return `/localitate/${slug}`;
    if (slug !== segments[1]) return `/regiune/${slug}`;
    return null;
  }

  if (segments[0] === "localitate" && segments.length === 2) {
    const slug = toSlug(segments[1]);
    if (!slug) return null;
    if (TOURISTIC_REGION_SLUGS.has(slug)) return `/regiune/${slug}`;
    if (slug !== segments[1]) return `/localitate/${slug}`;
    return null;
  }

  if (segments[0] !== "cazari") return null;

  if (segments.length >= 2) {
    const typeSlug = toTypeSlug(segments[1]);
    if (!TYPE_SLUGS.has(typeSlug)) return null;

    if (segments.length === 3) {
      const canonicalLocation = resolveLocationSegment(segments[2]);
      if (!canonicalLocation) return null;
      const destination = `/cazari/${typeSlug}/${canonicalLocation}`;
      return destination === pathname ? null : destination;
    }

    if (
      segments.length === 6 &&
      segments[2] === "facilitate" &&
      segments[4] === "judet"
    ) {
      const canonicalFacility = toFacilitySegment(segments[3]);
      const canonicalCounty = toCountySegment(segments[5]);
      if (!canonicalFacility || !canonicalCounty) return null;
      const destination = `/cazari/${typeSlug}/${canonicalCounty}/${canonicalFacility}`;
      return destination === pathname ? null : destination;
    }

    if (segments.length === 4) {
      const rawSecond = toSlug(segments[2]);
      const rawThird = toSlug(segments[3]);
      if (!rawSecond || !rawThird) return null;

      // Keep canonical localitate/regiune routes intact; these are not facility pages.
      if (rawSecond.startsWith("localitate-") || rawSecond.startsWith("regiune-")) return null;

      let canonicalCounty = "";
      let canonicalFacility = "";

      if (rawSecond.startsWith("judet-")) {
        canonicalCounty = toCountySegment(rawSecond);
        canonicalFacility = toFacilitySegment(rawThird);
      } else if (rawThird.startsWith("cu-")) {
        canonicalCounty = toCountySegment(rawSecond);
        canonicalFacility = toFacilitySegment(rawThird);
      } else {
        canonicalCounty = toCountySegment(rawThird);
        canonicalFacility = toFacilitySegment(rawSecond);
      }

      if (!canonicalCounty || !canonicalFacility) return null;
      const destination = `/cazari/${typeSlug}/${canonicalCounty}/${canonicalFacility}`;
      return destination === pathname ? null : destination;
    }
  }

  return null;
}

export function middleware(request: NextRequest) {
  const maintenanceEnabled = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
  const pathname = request.nextUrl.pathname;

  const isOnMaintenancePage = pathname.startsWith("/maintenance");
  const isStaticAsset = pathname.includes(".");

  if (maintenanceEnabled && !isOnMaintenancePage && !isStaticAsset) {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }

  const legacyRedirectPath = resolveLegacyRedirectPath(pathname);
  if (legacyRedirectPath && legacyRedirectPath !== pathname) {
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = legacyRedirectPath;
    return NextResponse.redirect(targetUrl, 301);
  }

  const isDrafts = pathname === "/drafts" || pathname.startsWith("/drafts/");
  const isSeoAdmin = pathname === "/admin-seo" || pathname.startsWith("/admin-seo/");
  const isDraftsLogin = pathname === "/drafts-login";
  const isDraftsLoginApi = pathname === "/api/drafts-login";
  if (isDraftsLogin || isDraftsLoginApi) {
    return NextResponse.next();
  }
  if (isDrafts || isSeoAdmin) {
    const authHeader = request.headers.get("authorization");
    const authCookie = request.cookies.get("drafts_auth")?.value || null;
    const headerAuth = getDraftAuthFromHeader(authHeader);
    const cookieRole = getRoleFromEncodedAuth(authCookie);
    const role = headerAuth?.role || cookieRole;
    const encoded = headerAuth?.encoded || authCookie;

    if (!role || !encoded) {
      const hasAttempt = !!authHeader || !!authCookie;
      const loginUrl = new URL(`/drafts-login${hasAttempt ? "?error=1" : ""}`, request.url);
      const response = NextResponse.redirect(loginUrl);
      if (authCookie) {
        response.cookies.set("drafts_auth", "", {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 0,
          path: "/",
        });
      }
      return response;
    }

    if (isSeoAdmin && role !== "admin") {
      return NextResponse.redirect(new URL("/drafts-login?error=1", request.url));
    }

    const response = NextResponse.next();
    if (headerAuth && authCookie !== encoded) {
      response.cookies.set("drafts_auth", encoded, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
    return response;
  }

  return NextResponse.next();
}
