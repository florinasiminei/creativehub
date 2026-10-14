import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Building2, CalendarDays, CreditCard, Instagram, Pencil } from "lucide-react";
import { CARD_IMAGE_QUALITY } from "@/lib/imageConfig";
import { formatOwnerDate } from "@/lib/ownerPortal";
import { formatPromotionDate, PROMOTION_STATUS_LABELS, type InstagramPromotionSummary } from "@/lib/social/instagram";

export type OwnerListing = {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  isPublished: boolean;
  createdAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  renewalDueAt: string | null;
  canRenew: boolean;
  daysUntilExpiry: number | null;
  image: string | null;
  pendingPayment?: {
    status: string;
    checkoutUrl?: string | null;
  } | null;
  instagramPromotion: InstagramPromotionSummary | null;
};

const secondaryAction = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-900";
const primaryAction = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:focus-visible:ring-offset-zinc-900";

function listingPresentation(listing: OwnerListing, promotionEnabled: boolean) {
  if (listing.status === "suspended") return {
    label: "Suspendată", description: "Contactează echipa CABN pentru informații despre republicare.",
    className: "bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-200",
  };
  if (listing.status === "expired" || (listing.daysUntilExpiry !== null && listing.daysUntilExpiry < 0)) return {
    label: "Expirată", description: "Cazarea nu mai este vizibilă în catalog. Verifică opțiunea de reînnoire.",
    className: "bg-orange-50 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200",
  };
  if (listing.status === "expiring" || (listing.daysUntilExpiry !== null && listing.daysUntilExpiry >= 0 && listing.daysUntilExpiry <= 30)) return {
    label: "Expiră curând", description: listing.daysUntilExpiry === 0 ? "Publicarea expiră astăzi. Reînnoiește pentru a păstra cazarea în catalog." : "Poți reînnoi publicarea înainte de expirare.",
    className: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  };
  if (listing.isPublished) return {
    label: "Publicată", description: "Cazarea este vizibilă în catalogul CABN.",
    className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  };
  if (listing.status === "submitted") return {
    label: "În verificare", description: promotionEnabled ? "Echipa CABN verifică detaliile. Poți pregăti între timp postarea Instagram." : "Echipa CABN verifică detaliile înainte de publicarea în catalog.",
    className: "bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200",
  };
  return {
    label: "Nepublicată", description: "Verifică detaliile cazării și completează informațiile necesare publicării.",
    className: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200",
  };
}

function promotionPresentation(promotion: InstagramPromotionSummary | null, available: boolean, isPublished: boolean) {
  if (!available) return {
    label: "Stare indisponibilă", description: "Nu am putut actualiza starea promovării. Deschide postarea sau reîncearcă mai târziu.", action: "Deschide promovarea", attention: false,
  };
  if (!promotion) return {
    label: "Nepregătită", description: "Alege fotografiile și personalizează textul. Îți cerem acordul înainte de programare.", action: "Pregătește postarea", attention: false,
  };
  if (promotion.status === "published") return {
    label: PROMOTION_STATUS_LABELS.published, description: promotion.published_at ? `Publicată pe Instagram la ${formatPromotionDate(promotion.published_at)}.` : "Postarea a fost publicată pe contul Instagram CABN.", action: "Vezi postarea aprobată", attention: false,
  };
  if (promotion.needs_reapproval) return {
    label: "Acord nou necesar", description: "Detaliile cazării s-au modificat. Revizuiește postarea și confirmă din nou versiunea finală.", action: "Revizuiește postarea", attention: true,
  };
  if (promotion.status === "scheduled") return {
    label: PROMOTION_STATUS_LABELS.scheduled, description: promotion.scheduled_for ? `Programată pentru ${formatPromotionDate(promotion.scheduled_for)}, ora României.` : "Acordul este salvat. Verifică data publicării în pagina postării.", action: "Vezi programarea", attention: false,
  };
  if (promotion.status === "approved") return {
    label: "Acord salvat", description: isPublished ? "Postarea așteaptă confirmarea programării în calendarul CABN." : "Postarea va putea fi programată după publicarea cazării pe CABN.", action: "Vezi postarea", attention: false,
  };
  if (promotion.status === "paused") return {
    label: PROMOTION_STATUS_LABELS.paused, description: "Promovarea este în pauză. Deschide postarea pentru a vedea ce urmează.", action: "Vezi detaliile", attention: false,
  };
  if (promotion.status === "cancelled") return {
    label: PROMOTION_STATUS_LABELS.cancelled, description: "Ai retras acordul pentru promovare. Poți revizui postarea și o poți aproba din nou.", action: "Revizuiește postarea", attention: false,
  };
  if (promotion.status === "error") return {
    label: PROMOTION_STATUS_LABELS.error, description: "Promovarea necesită o verificare. Deschide postarea pentru detalii și opțiunile disponibile.", action: "Verifică postarea", attention: true,
  };
  return {
    label: "De aprobat", description: "Preview-ul este salvat. Revizuiește imaginile și textul, apoi confirmă acordul pentru publicare.", action: "Revizuiește și aprobă", attention: true,
  };
}

export default function OwnerListingCard({ listing, promotionEnabled, promotionStatusAvailable, planPrice, checkoutListingId, actionsDisabled, onCheckout }: {
  listing: OwnerListing;
  promotionEnabled: boolean;
  promotionStatusAvailable: boolean;
  planPrice: string | null;
  checkoutListingId: string | null;
  actionsDisabled: boolean;
  onCheckout: (listingId: string) => void;
}) {
  const status = listingPresentation(listing, promotionEnabled);
  const paymentPending = listing.pendingPayment?.status === "pending";
  const checkoutUrl = listing.pendingPayment?.checkoutUrl;
  const promotion = promotionPresentation(listing.instagramPromotion, promotionStatusAvailable, listing.isPublished);

  return (
    <article className="flex flex-col overflow-hidden rounded-[26px] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid sm:grid-cols-[160px_minmax(0,1fr)]">
        <div className="relative aspect-[16/9] overflow-hidden bg-emerald-950/5 sm:aspect-auto sm:min-h-52">
          {listing.image ? (
            <Image src={listing.image} alt="" fill sizes="(max-width: 639px) calc(100vw - 48px), 160px" quality={CARD_IMAGE_QUALITY} className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"><Building2 className="h-9 w-9" aria-hidden="true" /></div>
          )}
        </div>
        <div className="min-w-0 p-5">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
          <h3 className="mt-3 break-words text-xl font-semibold leading-7 tracking-tight text-zinc-950 dark:text-white">{listing.title}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{status.description}</p>
          <p className="mt-3 flex items-center gap-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            {listing.expiresAt ? `Publicare până la ${formatOwnerDate(listing.expiresAt)}` : `Adăugată la ${formatOwnerDate(listing.createdAt)}`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/edit-property/${listing.id}?client=1`} className={secondaryAction}><Pencil className="h-4 w-4" aria-hidden="true" />Editează cazarea</Link>
            {listing.slug && listing.isPublished && <Link href={`/cazare/${listing.slug}`} className={secondaryAction}>Vezi pagina<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>}
            {listing.status === "suspended" && <Link href="/contact" className={secondaryAction}>Contactează CABN</Link>}
          </div>
        </div>
      </div>

      {(paymentPending || listing.canRenew) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 bg-amber-50/60 px-5 py-4 dark:border-zinc-800 dark:bg-amber-500/5">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200"><CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />{paymentPending ? "Reînnoire în curs" : "Reînnoirea publicării"}</div>
          {paymentPending && checkoutUrl ? (
            <a href={checkoutUrl} className={primaryAction}>Continuă plata<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
          ) : listing.canRenew ? (
            <button type="button" disabled={Boolean(checkoutListingId) || actionsDisabled} onClick={() => onCheckout(listing.id)} className={primaryAction}>{checkoutListingId === listing.id ? "Se pregătește..." : `Reînnoiește${planPrice ? ` · ${planPrice}` : ""}`}</button>
          ) : <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Starea se actualizează după confirmarea plății.</p>}
        </div>
      )}

      {promotionEnabled && (
        <div className="mt-auto border-t border-zinc-100 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-950/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white"><Instagram className="h-4 w-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />Promovare Instagram</h4>
            <span className={`text-xs font-semibold ${promotion.attention ? "text-amber-700 dark:text-amber-300" : "text-zinc-500 dark:text-zinc-400"}`}>{promotion.label}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{promotion.description}</p>
          <Link href={`/proprietari/promovare/${listing.id}`} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-emerald-200 dark:ring-emerald-900 dark:hover:bg-emerald-950 dark:focus-visible:ring-offset-zinc-900">{promotion.action}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      )}
    </article>
  );
}
