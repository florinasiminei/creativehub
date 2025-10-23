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

type PageProps = { params: { slug: string } };

const facilityIcons: { [key: string]: React.ReactNode } = {
  "Wi-Fi": <Wifi size={20} />,
  "TV": <Tv size={20} />,
  "Parcare gratuitÄƒ": <ParkingSquare size={20} />,
  "BucÄƒtÄƒrie complet utilatÄƒ": <Utensils size={20} />,
  "Aer condiÈ›ionat": <Wind size={20} />,
  "ÃŽncÄƒlzire": <Snowflake size={20} />,
  "Dormitor": <Bed size={20} />,
  "Baie privata": <Bath size={20} />,
  "Capacitate": <Users size={20} />,
};

// Nota: Ã®n Next 15 tipul exact al `params` poate fi promis Ã®n some APIs,
// aici folosim tip simplu pentru compatibilitate Ã®n componentÄƒ client.
export default function Page({ params }: PageProps) {
  const { slug } = params;
  const [data, setData] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fallbackWhatsappNumber = String(process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "");
  const sanitizedPhone = data?.phone ? data.phone.replace(/[^\d+]/g, "") : "";
  const telHref = sanitizedPhone || data?.phone?.trim() || "";
  const whatsappNumber = (sanitizedPhone || fallbackWhatsappNumber).replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    data ? `Bun\u0103! Sunt interesat de ${data.title}.` : "Bun\u0103! Sunt interesat de proprietate."
  )}`;

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

        if (listingError) throw new Error(`Eroare la Ã®ncÄƒrcarea proprietÄƒÈ›ii: ${listingError.message}`);
        if (!listing) throw new Error("Proprietatea nu a fost gÄƒsitÄƒ sau nu este publicatÄƒ");

        let listingImages: Array<{ image_url: string; display_order: number }> = [];
        const { data: images, error: imagesError } = await supabase
          .from("listing_images")
          .select("image_url, display_order")
          .eq("listing_id", listing.id)
          .order("display_order", { ascending: true });

        if (imagesError) {
          console.warn("Eroare la Ã®ncÄƒrcarea imaginilor:", imagesError);
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
          description: `BucuraÈ›i-vÄƒ de o È™edere de neuitat la ${listing.title}, o proprietate excepÈ›ionalÄƒ situatÄƒ Ã®n inima ${listing.location}. AceastÄƒ locaÈ›ie oferÄƒ un amestec perfect de confort modern È™i farmec local, fiind idealÄƒ pentru cupluri, familii sau grupuri de prieteni care doresc sÄƒ exploreze frumuseÈ›ile zonei.

Interiorul este amenajat cu gust, oferind spaÈ›ii generoase È™i luminoase. Fiecare detaliu a fost gÃ¢ndit pentru a vÄƒ asigura o experienÈ›Äƒ relaxantÄƒ È™i plÄƒcutÄƒ. De la bucÄƒtÄƒria complet utilatÄƒ, perfectÄƒ pentru a pregÄƒti mese delicioase, pÃ¢nÄƒ la dormitoarele confortabile, totul este pregÄƒtit pentru a vÄƒ simÈ›i ca acasÄƒ.`,
          highlights: [
            "PriveliÈ™te montanÄƒ superbÄƒ de la balcon",
            "Acces direct la trasee de drumeÈ›ii",
            "LiniÈ™te È™i intimitate deplinÄƒ",
            "Curte spaÈ›ioasÄƒ cu grÄƒtar È™i foiÈ™or",
          ],
        });
      } catch (e: any) {
        const message = e?.message || (typeof e === "string" ? e : "A apÄƒrut o eroare");
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
    <div className="min-h-screen bg-white dark:bg-transparent text-black dark:text-white">
      <main className="max-w-6xl mx-auto px-4 py-10">
        {loading && (
          <div className="flex items-center justify-center py-12 min-h-[60vh]">
            <LoadingLogo />
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 dark:text-red-400 text-xl mr-3">âš ï¸</div>
              <div>
                <h3 className="text-red-800 dark:text-red-200 font-semibold">
                  Eroare la Ã®ncÄƒrcare
                </h3>
                <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-12">
            <div>
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
                  className="w-full border border-gray-200 dark:border-zinc-800" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-12 items-start lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="order-last space-y-10 lg:order-none">
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
                          <span className="text-emerald-500">•</span>
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

              <aside className="order-first lg:order-none lg:sticky lg:top-24">
                <section aria-labelledby="contact-card">
                  <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-[0_28px_60px_-32px_rgba(15,23,42,0.65)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60">
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-emerald-100/40 dark:from-white/10 dark:via-transparent dark:to-emerald-500/10"
                      aria-hidden="true"
                    />
                    <div className="relative flex flex-col gap-6 font-sans">
                      <div className="space-y-2 text-left">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600/80 dark:text-emerald-400/90">
                          de la {data.price} lei / noapte
                        </p>
                        <h2 id="contact-card" className="text-2xl font-bold leading-snug text-gray-900 dark:text-white">
                          Rezervă fără comision
                        </h2>
                        <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300">
                          Direct de la proprietar
                        </p>
                      </div>

                      <div className="space-y-3">
                        {data.phone && telHref && (
                          <a
                            href={`tel:${telHref}`}
                            className="group inline-flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#34D399] via-[#10B981] to-[#047857] px-5 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-[2px] hover:shadow-emerald-500/30 focus-visible:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10B981]"
                          >
                            <span aria-hidden="true" className="text-xl leading-none">
                              📞
                            </span>
                            <span>Sună acum</span>
                          </a>
                        )}
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[#25D366] bg-white/40 px-5 py-4 text-base font-semibold text-[#0c4a2f] shadow-sm transition-all duration-300 hover:-translate-y-[2px] hover:bg-[#25D366]/10 hover:shadow-md focus-visible:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] dark:bg-transparent dark:text-[#25D366]"
                        >
                          <span aria-hidden="true" className="text-xl leading-none">
                            💬
                          </span>
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366] text-white">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 32 32"
                              className="h-4 w-4"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M16 3c-7.18 0-13 5.82-13 13 0 2.24.59 4.44 1.72 6.37L3 29l6.79-1.77C11.62 28.1 13.79 29 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm0 23c-2.1 0-4.11-.56-5.87-1.63l-.42-.25-4.02 1.05 1.07-3.92-.26-.43A9.92 9.92 0 0 1 6 16c0-5.51 4.49-10 10-10s10 4.49 10 10-4.49 10-10 10zm5.23-7.7c-.29-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.63.15-.18.29-.72.94-.88 1.13-.16.18-.32.2-.6.07-.29-.15-1.22-.45-2.34-1.43-.86-.75-1.38-1.66-1.55-1.95-.16-.29-.02-.45.12-.58.13-.13.29-.32.43-.48.14-.16.18-.29.27-.48.09-.18.04-.35-.02-.48-.07-.13-.63-1.57-.86-2.16-.23-.59-.47-.53-.63-.53-.16 0-.35-.02-.54-.02-.19 0-.5.08-.75.37-.25.29-1.01 1.09-1.01 2.63s1.03 3.05 1.18 3.26c.15.21 2.03 3.25 4.91 4.49 1.82.79 2.53.86 3.44.73.55-.08 1.69-.69 1.93-1.35.24-.66.24-1.21.17-1.35-.07-.14-.26-.22-.55-.36z" />
                            </svg>
                          </span>
                          <span>WhatsApp</span>
                        </a>
                      </div>

                      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                        Nu păstrăm istoricul apelurilor.
                      </p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
