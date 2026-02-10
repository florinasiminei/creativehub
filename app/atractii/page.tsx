import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCanonicalSiteUrl, toCanonicalUrl } from "@/lib/siteUrl";

export const revalidate = 60 * 30;

type AttractionRow = {
  id: string;
  title: string;
  slug: string;
  location_name: string;
  price: number | null;
  description: string | null;
  judet: string | null;
  city: string | null;
  sat: string | null;
  attraction_images?: { image_url?: string | null }[] | null;
};

type AttractionCard = {
  id: string;
  slug: string;
  title: string;
  location: string;
  price: number | null;
  description: string;
  image: string;
};

const siteUrl = getCanonicalSiteUrl();

export const metadata: Metadata = {
  title: "Atractii",
  description:
    "Atractii si experiente locale langa cabane si pensiuni, publicate de gazde si administratori.",
  alternates: {
    canonical: toCanonicalUrl("/atractii"),
  },
  openGraph: {
    title: "Atractii",
    description: "Atractii si experiente locale langa cabane si pensiuni.",
    url: `${siteUrl}/atractii`,
    siteName: "cabn.ro",
    locale: "ro_RO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atractii",
    description: "Atractii si experiente locale langa cabane si pensiuni.",
  },
};

function formatLocation(row: AttractionRow): string {
  const parts = [row.location_name, row.sat, row.city, row.judet]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (parts.length === 0) return "Locatie nedefinita";
  return Array.from(new Set(parts)).join(", ");
}

async function getPublishedAttractions(): Promise<AttractionCard[]> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const select =
      "id, title, slug, location_name, price, description, judet, city, sat, attraction_images(image_url, display_order)";
    const { data, error } = await supabaseAdmin
      .from("attractions")
      .select(select)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .order("display_order", { foreignTable: "attraction_images", ascending: true })
      .limit(1, { foreignTable: "attraction_images" });

    if (error) {
      console.error("[atractii] published attractions fetch failed", error.message);
      return [];
    }

    return ((data || []) as AttractionRow[]).map((row) => {
      const firstImage =
        Array.isArray(row.attraction_images) && row.attraction_images.length > 0
          ? String(row.attraction_images[0]?.image_url || "").trim()
          : "";
      const numericPrice =
        row.price === null || row.price === undefined ? null : Number(row.price);
      const slug = String(row.slug || "").trim();

      return {
        id: String(row.id),
        slug,
        title: String(row.title || ""),
        location: formatLocation(row),
        price: Number.isFinite(numericPrice) ? numericPrice : null,
        description: String(row.description || "").trim(),
        image: firstImage || "/images/logo.svg",
      };
    });
  } catch (error) {
    console.error("[atractii] page render failed", error);
    return [];
  }
}

export default async function AtractiiPage() {
  const attractions = await getPublishedAttractions();

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-transparent dark:text-white">
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600/80">
            cabn.ro
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Atractii</h1>
          <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
            Descopera atractii locale publicate pe platforma, pe care le poti combina cu
            cazarea potrivita.
          </p>
        </header>

        {attractions.length === 0 ? (
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 text-emerald-900 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-900/20 dark:text-emerald-100">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-emerald-700 shadow-sm dark:bg-white/10 dark:text-emerald-200">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
                  <path
                    d="M12 3l7 3v6c0 5-4 8-7 9-3-1-7-4-7-9V6l7-3z"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 12.5l1.6 1.6L15 10.2"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Inca nu exista atractii publicate</h2>
                <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80">
                  Dupa publicare din Drafts, atractiile apar automat aici.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
              >
                Spune-ne ce cauti
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100/70 dark:border-emerald-500/30 dark:text-emerald-100 dark:hover:bg-emerald-500/10"
              >
                Vezi cazari
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {attractions.map((item) => (
              <Link
                key={item.id}
                href={`/atractie/${encodeURIComponent(item.slug)}`}
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <article>
                  <div className="relative aspect-[2.7/2] overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-1 text-lg font-semibold">{item.title}</h2>
                      {item.price !== null && item.price > 0 ? (
                        <span className="shrink-0 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          de la {item.price} lei
                        </span>
                      ) : null}
                    </div>
                    <p className="line-clamp-1 text-sm text-zinc-600 dark:text-zinc-300">{item.location}</p>
                    {item.description ? (
                      <p className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {item.description}
                      </p>
                    ) : null}
                    <p className="pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                      Vezi atractia
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
