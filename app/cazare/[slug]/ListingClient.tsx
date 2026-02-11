"use client";

import { useEffect, useState } from "react";
import LoadingLogo from "@/components/LoadingLogo";
import SubtleBackLink from "@/components/SubtleBackLink";
import PropertyImageGrid from "@/components/listing/PropertyImageGrid";
import { resolveFacilityIcon } from "@/lib/facilityIcons";
import { resolveListingTypeIcon } from "@/lib/listingTypeIcons";
import { MapPin, Users } from "lucide-react";

type Facility = { id: string; name: string };
export type Listing = {
  id: string;
  title: string;
  city?: string;
  sat?: string;
  judet?: string;
  type: string;
  capacity: string;
  price: number;
  phone?: string;
  images: string[];
  facilities: Facility[];
  description: string;
  highlights: string[];
  camere?: number;
  paturi?: number;
  bai?: number;
  latitude?: number | null;
  longitude?: number | null;
  searchRadius?: number | null;
};

type Props = {
  data: Listing;
};

export default function ListingClient({ data }: Props) {
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const [facilityLimit, setFacilityLimit] = useState(8);
  const typeLabelMap: Record<string, string> = {
    cabana: "Cabană",
    "a-frame": "A-Frame",
    pensiune: "Pensiune",
    apartament: "Apartament",
    "tiny house": "Tiny house",
    "casa de vacanta": "Casă de vacanță",
  };
  const normalizedType = data.type.trim().toLowerCase();
  const typeLabel = typeLabelMap[normalizedType] ?? normalizedType
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(normalizedType.includes("-") ? "-" : " ");
  const cityLabel = data.sat ? `${data.city} (${data.sat})` : data.city;
  const locationLabel = [cityLabel, data.judet].filter(Boolean).join(", ") || "România";
  const fallbackWhatsappNumber = String(process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "");
  const sanitizedPhone = data?.phone ? data.phone.replace(/[^\d+]/g, "") : "";
  const telHref = sanitizedPhone || data?.phone?.trim() || "";
  const whatsappNumber = (sanitizedPhone || fallbackWhatsappNumber).replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    data ? `Bună! Sunt interesat de ${data.title}.` : "Bună! Sunt interesat de proprietate."
  )}`;

  useEffect(() => {
    const getLimit = () => {
      if (typeof window === "undefined") return 8;
      const width = window.innerWidth;
      if (width >= 768) return 8; // md: 4 columns x 2 rows
      if (width >= 640) return 6; // sm: 3 columns x 2 rows
      return 4; // base: 2 columns x 2 rows
    };
    const update = () => setFacilityLimit(getLimit());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-transparent text-black dark:text-white">
      <main className="max-w-6xl mx-auto px-4 pt-3 pb-10">
        {!data && (
          <div className="flex items-center justify-center py-12 min-h-[60vh]">
            <LoadingLogo />
          </div>
        )}

        {data && (
          <div className="space-y-12">
            <div>
              <div className="mb-2">
                <SubtleBackLink href="/" label="Inapoi la listari" />
              </div>
              <h1 className="text-4xl font-extrabold mb-2 tracking-tight">{data.title}</h1>

              <div className="text-gray-600 dark:text-gray-400 mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    <MapPin size={16} />
                  </span>
                  {locationLabel}
                </span>
                <span>|</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400">{resolveListingTypeIcon(data.type)}</span>
                  {typeLabel}
                </span>
                <span>|</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    <Users size={16} />
                  </span>
                  {data.capacity} persoane
                </span>
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
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line break-words leading-relaxed">
                    {data.description}
                  </p>
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2">
                    <span>🚪 {data.camere ?? 0} camere</span>
                    <span>·</span>
                    <span>🛏️ {data.paturi ?? 0} paturi</span>
                    <span>·</span>
                    <span>🛁 {data.bai ?? 0} bai</span>
                  </div>
                </div>

                {(() => {
                  const visibleFacilities = showAllFacilities
                    ? data.facilities
                    : data.facilities.slice(0, facilityLimit);
                  const hasMoreFacilities = data.facilities.length > facilityLimit;
                  return (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b pb-2">
                        <h2 className="text-2xl font-bold">Facilitati oferite</h2>
                      </div>
                      {data.facilities.length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Nu sunt facilitati selectate pentru aceasta cazare.
                        </p>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {visibleFacilities.map((f) => (
                              <div
                                key={f.id}
                                className="flex items-center gap-2 rounded-lg border border-gray-200/80 bg-white/70 px-2.5 py-2 shadow-sm transition hover:-translate-y-[1px] hover:border-emerald-200/80 dark:border-zinc-800 dark:bg-zinc-900/60"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                                  {resolveFacilityIcon(f.name)}
                                </div>
                                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                  {f.name}
                                </span>
                              </div>
                            ))}
                          </div>
                          {hasMoreFacilities && (
                            <button
                              type="button"
                              onClick={() => setShowAllFacilities((prev) => !prev)}
                              className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
                            >
                              {showAllFacilities ? "Arata mai putin" : "Arata toate"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <div className="flex items-center justify-between gap-3 mb-4 border-b pb-2">
                    <h2 className="text-2xl font-bold">Locație pe hartă</h2>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600/80">Google Maps</span>
                  </div>
                  {(() => {
                    const lat = Number(data.latitude);
                    const lng = Number(data.longitude);
                    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
                    const locationQuery = encodeURIComponent(locationLabel || "");
                    const mapSrc = hasCoords
                      ? `https://www.google.com/maps?q=${lat},${lng}&z=14&output=embed`
                      : `https://www.google.com/maps?q=${locationQuery}&z=12&output=embed`;
                    const directionsHref = hasCoords
                      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
                      : `https://www.google.com/maps/dir/?api=1&destination=${locationQuery}`;
                    return (
                      <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
                        <div className="relative overflow-hidden rounded-2xl aspect-[16/9] bg-gray-50 dark:bg-zinc-800">
                          <iframe
                            title="Google Maps"
                            src={mapSrc}
                            className="absolute inset-0 h-full w-full filter dark:invert dark:hue-rotate-180 dark:saturate-75 dark:brightness-90 dark:contrast-90"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                          {!hasCoords && (
                            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-emerald-700 shadow dark:bg-zinc-900/80 dark:text-emerald-200">
                              Zonă aproximativă
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {locationLabel}
                          </span>
                          <a
                            href={directionsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/60 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
                          >
                            Get directions
                          </a>
                        </div>
                      </div>
                    );
                  })()}
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
