"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

type Facility = { id: string; name: string };
type Listing = {
  id: string;
  title: string;
  location: string;
  type: string;
  capacity: number;
  price: number;
  phone?: string;
  images: string[];
  facilities: Facility[];
};

type PageProps = { params: { slug: string } };

// Nota: în Next 15 tipul exact al `params` poate fi promis în some APIs,
// aici folosim tip simplu pentru compatibilitate în componentă client.
export default function Page({ params }: PageProps) {
  const [data, setData] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data: listing, error: listingError } = await supabase
          .from("listings")
          .select(
            `
            id, slug, title, type, location, capacity, price, phone, is_published,
            listing_facilities(
              facilities(id, name)
            )
          `
          )
          .eq("slug", params?.slug)
          .eq("is_published", true)
          .maybeSingle();

        if (listingError) throw listingError;
        if (!listing) throw new Error("Proprietatea nu a fost găsită");

        const { data: images, error: imagesError } = await supabase
          .from("listing_images")
          .select("image_url, display_order")
          .eq("listing_id", (listing as any).id)
          .order("display_order", { ascending: true });

        if (imagesError) {
          console.warn("Eroare la încărcarea imaginilor:", imagesError);
        }

        const priceRaw = (listing as any).price;
        const capacityRaw = (listing as any).capacity;

        const price =
          typeof priceRaw === "number"
            ? priceRaw
            : parseInt(String(priceRaw ?? "0").replace(/\D/g, "")) || 0;

        const capacity =
          typeof capacityRaw === "number"
            ? capacityRaw
            : parseInt(String(capacityRaw ?? "").match(/\d+/)?.[0] ?? "1");

        const facilitiesRows =
          ((listing as any).listing_facilities ?? []) as Array<{
            facilities?: { id: string; name: string } | null;
          }>;

        const facilities = facilitiesRows
          .map((f) =>
            f?.facilities ? { id: f.facilities.id, name: f.facilities.name } : null
          )
          .filter(Boolean) as Facility[];

        const imagesUrls = (images ?? [])
          .map((i) => i.image_url)
          .filter(Boolean) as string[];

        if (cancelled) return;

        setData({
          id: (listing as any).id,
          title: (listing as any).title,
          location: (listing as any).location,
          type: (listing as any).type,
          capacity,
          price,
          phone: (listing as any).phone ? String((listing as any).phone) : undefined,
          images: imagesUrls.length ? imagesUrls : ["/fallback.jpg"],
          facilities,
        });
      } catch (e: any) {
        const message = e?.message || (typeof e === "string" ? e : "A apărut o eroare");
        if (!cancelled) setError(String(message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params?.slug]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <main className="max-w-6xl mx-auto px-4 py-10">
        {loading && <div className="py-16 text-center">Se încarcă proprietatea...</div>}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 dark:text-red-400 text-xl mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 dark:text-red-200 font-semibold">
                  Eroare la încărcare
                </h3>
                <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold mb-2">{data.title}</h1>

              <div className="text-gray-600 dark:text-gray-400 mb-6 flex flex-wrap items-center gap-2 text-sm">
                <span>📍 {data.location}</span>
                <span>·</span>
                <span>{data.type}</span>
                <span>·</span>
                <span>👥 {data.capacity} persoane</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {data.images.map((src, idx) => (
                  <Image
                    key={idx}
                    src={src}
                    alt={data.title}
                    width={1200}
                    height={900}
                    className="w-full h-[260px] sm:h-[320px] rounded-xl border object-cover"
                  />
                ))}
              </div>

              {data.facilities.length > 0 && (
                <div className="mb-10">
                  <h2 className="text-xl font-semibold mb-3">Facilități</h2>
                  <div className="flex flex-wrap gap-2">
                    {data.facilities.map((f) => (
                      <span
                        key={f.id}
                        className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl border border-gray-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900 shadow-sm">
                <div className="text-2xl font-bold">{data.price} lei</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">pe noapte</div>

                <div className="space-y-3">
                  {data.phone && (
                    <a
                      href={`tel:${data.phone}`}
                      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition"
                    >
                      📞 Sună proprietarul
                    </a>
                  )}
                  <a
                    href={`https://wa.me/${(data.phone && data.phone.replace(/^\+/, "")) || String(process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "")}?text=${encodeURIComponent(
                      `Bună! Sunt interesat de ${data.title}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:brightness-95 text-white px-4 py-2 rounded-lg transition"
                  >
                    💬 WhatsApp
                  </a>
                </div>

                <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                  👥 Capacitate: {data.capacity} persoane
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}