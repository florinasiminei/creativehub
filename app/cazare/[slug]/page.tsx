"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import LoadingLogo from "@/components/LoadingLogo";
import { supabase } from "@/lib/supabaseClient";
import PropertyImageGrid from "@/components/PropertyImageGrid";
import { Bed, Bath, Users, Wifi, Tv, ParkingSquare, Utensils, Wind, Snowflake, MapPin } from "lucide-react";

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
  description: string;
  highlights: string[];
};

// Use a permissive type here because the build-time generated types for
// page props can vary (some Next versions expect Promise-like params).
// Using `any` keeps the runtime behavior unchanged and avoids build-time
// type mismatches for now.
type PageProps = any;

const facilityIcons: { [key: string]: React.ReactNode } = {
  "Wi-Fi": <Wifi size={20} />,
  "TV": <Tv size={20} />,
  "Parcare gratuită": <ParkingSquare size={20} />,
  "Bucătărie complet utilată": <Utensils size={20} />,
  "Aer condiționat": <Wind size={20} />,
  "Încălzire": <Snowflake size={20} />,
  "Dormitor": <Bed size={20} />,
  "Baie privata": <Bath size={20} />,
  "Capacitate": <Users size={20} />,
};

// Nota: în Next 15 tipul exact al `params` poate fi promis în some APIs,
// aici folosim tip simplu pentru compatibilitate în componentă client.
export default function Page({ params }: PageProps) {
  const [data, setData] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const slug = params?.slug;

  useEffect(() => {
    if (!slug) {
      setError("URL invalid");
      setLoading(false);
      return;
    }

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
          .eq("slug", slug)
          .eq("is_published", true)
          .maybeSingle();

        if (listingError) throw new Error(`Eroare la încărcarea proprietății: ${listingError.message}`);
        if (!listing) throw new Error("Proprietatea nu a fost găsită sau nu este publicată");

        let listingImages: Array<{ image_url: string; display_order: number }> = [];
        const { data: images, error: imagesError } = await supabase
          .from("listing_images")
          .select("image_url, display_order")
          .eq("listing_id", listing.id)
          .order("display_order", { ascending: true });

        if (imagesError) {
          console.warn("Eroare la încărcarea imaginilor:", imagesError);
        } else {
          listingImages = images || [];
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

        const imagesUrls = listingImages
          .map((i) => i.image_url)
          .filter((url): url is string => typeof url === 'string' && url.length > 0);
        
        let displayImages: string[] = imagesUrls.length > 0 ? imagesUrls : ["/fallback.jpg"];

        if (cancelled) return;

        setData({
          id: (listing as any).id,
          title: (listing as any).title,
          location: (listing as any).location,
          type: (listing as any).type,
          capacity,
          price,
          phone: (listing as any).phone ? String((listing as any).phone) : undefined,
          images: displayImages,
          facilities,
          description: `Bucurați-vă de o ședere de neuitat la ${listing.title}, o proprietate excepțională situată în inima ${listing.location}. Această locație oferă un amestec perfect de confort modern și farmec local, fiind ideală pentru cupluri, familii sau grupuri de prieteni care doresc să exploreze frumusețile zonei.

Interiorul este amenajat cu gust, oferind spații generoase și luminoase. Fiecare detaliu a fost gândit pentru a vă asigura o experiență relaxantă și plăcută. De la bucătăria complet utilată, perfectă pentru a pregăti mese delicioase, până la dormitoarele confortabile, totul este pregătit pentru a vă simți ca acasă.`,
          highlights: [
            "Priveliște montană superbă de la balcon",
            "Acces direct la trasee de drumeții",
            "Liniște și intimitate deplină",
            "Curte spațioasă cu grătar și foișor",
          ],
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
  }, [slug]); // Folosim slug-ul validat

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <main className="max-w-6xl mx-auto px-4 py-10">
        {loading && <LoadingLogo />}

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h1 className="text-4xl font-extrabold mb-2 tracking-tight">{data.title}</h1>

              <div className="text-gray-600 dark:text-gray-400 mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
                <span className="flex items-center gap-1.5"> <MapPin size={16} /> {data.location}</span>
                <span>·</span>
                <span>{data.type}</span>
                <span>·</span>
                <span className="flex items-center gap-1.5"><Users size={16} /> {data.capacity} persoane</span>
              </div>

              <div className="mb-8">
                <PropertyImageGrid 
                  images={data.images} 
                  title={data.title}
                  className="border border-gray-200 dark:border-zinc-800" 
                />
              </div>
              
              <div className="space-y-10">
                <div>
                  <h2 className="text-2xl font-bold mb-4 border-b pb-2">Despre această proprietate</h2>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    {data.description}
                  </p>
                </div>

                {data.highlights.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 border-b pb-2">Ce ne place la această locație</h2>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      {data.highlights.map((highlight, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className="text-emerald-500">✓</span>
                          <span className="text-gray-800 dark:text-gray-200">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.facilities.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 border-b pb-2">Facilități oferite</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {data.facilities.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800"
                        >
                          <div className="text-emerald-600 dark:text-emerald-400">
                            {facilityIcons[f.name] || <Users size={20} />}
                          </div>
                          <span className="text-sm font-medium">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-bold mb-4 border-b pb-2">Locație pe hartă</h2>
                  <div className="aspect-w-16 aspect-h-9 bg-gray-200 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Hartă în curând</p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900 shadow-lg">
                <div className="text-3xl font-bold">{data.price} lei</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-5">/ noapte</div>

                <div className="space-y-3">
                  {data.phone && (
                    <a
                      href={`tel:${data.phone}`}
                      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg transition font-semibold"
                    >
                      📞 Sună Acum
                    </a>
                  )}
                  <a
                    href={`https://wa.me/${(data.phone && data.phone.replace(/^\+/, "")) || String(process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "")}?text=${encodeURIComponent(
                      `Bună! Sunt interesat de ${data.title}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:brightness-95 text-white px-4 py-3 rounded-lg transition font-semibold"
                  >
                    💬 Contactează pe WhatsApp
                  </a>
                </div>

                <div className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
                  Rezervare rapidă și fără comision.
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
