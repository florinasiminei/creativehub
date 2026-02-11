import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCanonicalSiteUrl, toCanonicalUrl } from "@/lib/siteUrl";
import PropertyImageGrid from "@/components/listing/PropertyImageGrid";
import SubtleBackLink from "@/components/SubtleBackLink";

export const revalidate = 60 * 30;

type PageProps = {
  params: { slug: string };
};

type AttractionRow = {
  id: string;
  title: string;
  slug: string;
  location_name: string;
  price: number | string | null;
  description: string | null;
  judet: string | null;
  city: string | null;
  sat: string | null;
  lat: number | string | null;
  lng: number | string | null;
  attraction_images?: { image_url?: string | null; display_order?: number | null }[] | null;
};

type AttractionData = {
  id: string;
  title: string;
  slug: string;
  locationName: string;
  locationLabel: string;
  price: number | null;
  description: string;
  lat: number | null;
  lng: number | null;
  images: string[];
};

const siteUrl = getCanonicalSiteUrl();

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function truncate(text: string, max = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}...`;
}

function formatLocationLabel(row: AttractionRow): string {
  const parts = [row.location_name, row.sat, row.city, row.judet]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (parts.length === 0) return "Locatie nedefinita";
  return Array.from(new Set(parts)).join(", ");
}

async function fetchAttraction(slug: string): Promise<AttractionData | null> {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) return null;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const select =
      "id, title, slug, location_name, price, description, judet, city, sat, lat, lng, attraction_images(image_url, display_order)";
    const { data, error } = await supabaseAdmin
      .from("attractions")
      .select(select)
      .eq("slug", normalizedSlug)
      .eq("is_published", true)
      .order("display_order", { foreignTable: "attraction_images", ascending: true })
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error("[atractie] fetch failed", { slug: normalizedSlug, error: error.message });
      }
      return null;
    }

    const row = data as unknown as AttractionRow;
    const images =
      row.attraction_images
        ?.map((img) => String(img?.image_url || "").trim())
        .filter((url) => url.length > 0) || [];

    const price = toNumber(row.price);
    const lat = toNumber(row.lat);
    const lng = toNumber(row.lng);
    const description =
      typeof row.description === "string" && row.description.trim().length > 0
        ? row.description.trim()
        : "Aceasta atractie este disponibila pe platforma cabn.ro.";

    return {
      id: String(row.id),
      title: String(row.title || ""),
      slug: String(row.slug || normalizedSlug),
      locationName: String(row.location_name || ""),
      locationLabel: formatLocationLabel(row),
      price,
      description,
      lat,
      lng,
      images: images.length > 0 ? images : ["/images/logo.svg"],
    };
  } catch (error) {
    console.error("[atractie] unexpected fetch error", error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const attraction = await fetchAttraction(params.slug);
  if (!attraction) return {};

  const locationSuffix = attraction.locationLabel ? ` | ${attraction.locationLabel}` : "";
  const title = `${attraction.title}${locationSuffix}`;
  const description = truncate(attraction.description);
  const image = attraction.images[0] || "/images/logo.svg";
  const canonical = toCanonicalUrl(`/atractie/${attraction.slug}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${siteUrl}/atractie/${attraction.slug}`,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function AtractiePage({ params }: PageProps) {
  const attraction = await fetchAttraction(params.slug);
  if (!attraction) notFound();

  const mapsHref =
    attraction.lat !== null && attraction.lng !== null
      ? `https://www.google.com/maps?q=${attraction.lat},${attraction.lng}`
      : null;
  const hasPrice = attraction.price !== null && attraction.price > 0;

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-transparent dark:text-white">
      <main className="mx-auto max-w-6xl px-4 pt-3 pb-10 sm:px-6 lg:px-8">
        <div className="mb-2">
          <SubtleBackLink href="/atractii" label="Inapoi la atractii" />
        </div>

        <section>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Atractie
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{attraction.title}</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{attraction.locationLabel}</p>
          </div>

          <PropertyImageGrid
            images={attraction.images}
            title={attraction.title}
            className="w-full border border-gray-200 dark:border-zinc-800"
          />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <article className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Despre aceasta atractie</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-zinc-700 dark:text-zinc-300">
              {attraction.description}
            </p>
          </article>

          <aside className="space-y-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            {hasPrice ? (
              <div className="rounded-xl bg-zinc-100 px-4 py-3 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                <p className="text-xs uppercase tracking-[0.16em]">Acces</p>
                <p className="mt-1 text-lg font-semibold">de la {attraction.price} lei</p>
                <p className="mt-1 text-xs opacity-80">Tarif orientativ de intrare</p>
              </div>
            ) : null}

            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Vezi pe harta
              </a>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Coordonate indisponibile.</p>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
