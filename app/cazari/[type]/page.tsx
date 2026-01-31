import Link from "next/link";
import { notFound } from "next/navigation";
import ListingsGrid from "@/components/listing/ListingGrid";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapListingSummary } from "@/lib/transformers";
import { getTypeBySlug, LISTING_TYPES } from "@/lib/listingTypes";
import type { ListingRaw } from "@/lib/types";

export const revalidate = 60 * 60 * 12;

type PageProps = {
  params: { type: string };
};

export async function generateStaticParams() {
  return LISTING_TYPES.map((type) => ({ type: type.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const listingType = getTypeBySlug(params.type);
  if (!listingType) return {};
  const title = `${listingType.label} în România | CABN.ro`;
  const description = `Descoperă ${listingType.label.toLowerCase()} atent selectate, cu verificare foto/video și rezervare direct la gazdă.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

async function getTypeListings(typeValue: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const baseSelect = `
    id, title, slug, type, location, address, capacity, price, phone, is_published, display_order,
    camere, paturi, bai,
    listing_images(image_url, display_order),
    listing_facilities(
      facilities(id, name)
    )
  `;

  const withOrder = await supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .eq("is_published", true)
    .eq("type", typeValue)
    .order("display_order", { ascending: false, nullsFirst: false })
    .order("display_order", { foreignTable: "listing_images", ascending: true })
    .limit(1, { foreignTable: "listing_images" });

  let data = withOrder.data;
  let error = withOrder.error;

  if (error && String(error.message || "").includes("display_order")) {
    const fallback = await supabaseAdmin
      .from("listings")
      .select(baseSelect)
      .eq("is_published", true)
      .eq("type", typeValue)
      .order("display_order", { foreignTable: "listing_images", ascending: true })
      .limit(1, { foreignTable: "listing_images" });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return (data as unknown as ListingRaw[]).map((row) => mapListingSummary(row));
}

export default async function TypePage({ params }: PageProps) {
  const listingType = getTypeBySlug(params.type);
  if (!listingType) return notFound();

  const listings = await getTypeListings(listingType.value);

  return (
    <main className="min-h-screen px-4 lg:px-6 py-10">
      <header className="max-w-4xl mx-auto text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-700 font-semibold">
          CABN.ro
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold mt-3">
          {listingType.label} verificate
        </h1>
        <p className="text-gray-600 mt-3">
          Listări curate, cu verificare vizuală și contact direct la gazdă.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/descoperaCABN#contact"
            className="px-6 py-2.5 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 transition"
          >
            Înscrie proprietatea ta
          </Link>
          <Link
            href="/contact"
            className="px-6 py-2.5 rounded-full border border-emerald-300 text-emerald-900 hover:bg-emerald-100 transition"
          >
            Contactează-ne
          </Link>
        </div>
      </header>

      <section className="mt-10">
        {listings.length === 0 ? (
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 px-6 py-10 text-center">
            <div className="text-5xl mb-3">🏡</div>
            <h2 className="text-2xl font-semibold text-emerald-900 mb-2">
              Momentan nu avem {listingType.label.toLowerCase()} publicate
            </h2>
            <p className="text-emerald-800/80 max-w-2xl mx-auto">
              Publicăm treptat locații reale, atent verificate. Revino în curând sau înscrie o proprietate.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-2 gap-y-8">
            <ListingsGrid cazari={listings} />
          </div>
        )}
      </section>
    </main>
  );
}
