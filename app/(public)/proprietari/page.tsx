"use client";

import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  LogOut,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import OwnerOtpGate from "@/components/forms/OwnerOtpGate";
import FormPageShell, { FormPageState } from "@/components/forms/FormPageShell";
import ListingSubmitFeedback from "@/components/forms/ListingSubmitFeedback";
import { fetchOwnerApi } from "@/lib/api/ownerSession";
import { CARD_IMAGE_QUALITY } from "@/lib/imageConfig";
import {
  OWNER_CLAIM_LIMITS,
  OWNER_CLAIM_ROLES,
  validateOwnerClaimDetails,
  type OwnerClaimErrors,
} from "@/lib/validation/ownerClaim";

type OwnerListing = {
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
};

type OwnerClaim = {
  id: string;
  listingTitle: string;
  status: string;
  createdAt: string | null;
};

type OwnerPlan = {
  name: string;
  amount: number;
  currency: string;
  durationMonths: number;
};

type OwnerOverview = {
  user: { email: string | null };
  listings: OwnerListing[];
  claims: OwnerClaim[];
  plan: OwnerPlan | null;
};

const cardClassName =
  "rounded-[26px] border border-zinc-200 bg-white shadow-[0_20px_50px_-36px_rgba(15,23,42,0.5)] dark:border-zinc-800 dark:bg-zinc-900";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPrice(plan: OwnerPlan | null) {
  if (!plan) return null;
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: plan.currency || "RON",
    maximumFractionDigits: 0,
  }).format(plan.amount);
}

function statusPresentation(listing: OwnerListing) {
  if (listing.status === "suspended") {
    return { label: "Suspendată", className: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200" };
  }
  if (
    listing.status === "expired" ||
    (listing.daysUntilExpiry !== null && listing.daysUntilExpiry < 0)
  ) {
    return { label: "Expirată", className: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200" };
  }
  if (
    listing.status === "expiring" ||
    (listing.daysUntilExpiry !== null &&
      listing.daysUntilExpiry >= 0 &&
      listing.daysUntilExpiry <= 30)
  ) {
    return { label: "Expiră curând", className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200" };
  }
  if (listing.isPublished) {
    return { label: "Publicată", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200" };
  }
  if (listing.status === "submitted") {
    return { label: "În verificare", className: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200" };
  }
  return { label: "Nepublicată", className: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200" };
}

function claimStatusPresentation(status: string) {
  if (status === "approved") return {
    label: "Aprobată",
    description: "Solicitarea a fost aprobată. Proprietățile asociate contului sunt afișate mai sus.",
    className: "text-emerald-700 dark:text-emerald-300",
  };
  if (status === "rejected") return {
    label: "Respinsă",
    description: "Cererea nu a fost aprobată. Contactează echipa CABN pentru clarificări.",
    className: "text-orange-700 dark:text-orange-300",
  };
  if (status === "cancelled") return {
    label: "Anulată",
    description: "Această cerere a fost anulată.",
    className: "text-zinc-600 dark:text-zinc-300",
  };
  return {
    label: "În verificare",
    description: "Verificăm solicitarea. După aprobare, cazarea va apărea în lista ta de proprietăți.",
    className: "text-amber-700 dark:text-amber-300",
  };
}

class OwnerRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "OwnerRequestError";
  }
}

async function readResponse(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      throw new OwnerRequestError("Sesiunea nu mai este validă. Confirmă din nou emailul pentru a continua.", 401);
    }
    throw new OwnerRequestError(body?.error || body?.message || "Cererea nu a putut fi procesată.", response.status, body?.code);
  }
  return body;
}

function OwnerDashboard({
  session,
  signOut,
  initialListingReference,
  paymentResult,
  submissionResult,
  updatedResult,
}: {
  session: Session;
  signOut: () => Promise<void>;
  initialListingReference: string;
  paymentResult: string;
  submissionResult: string;
  updatedResult: string;
}) {
  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewError, setOverviewError] = useState<{
    message: string;
    requiresLogin: boolean;
    schemaUnavailable: boolean;
  } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [checkoutListingId, setCheckoutListingId] = useState<string | null>(null);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [listingReference, setListingReference] = useState(initialListingReference);
  const [claimMessage, setClaimMessage] = useState("");
  const [claimContact, setClaimContact] = useState({ fullName: "", phone: "", role: "" });
  const [claimErrors, setClaimErrors] = useState<OwnerClaimErrors>({});
  const [claimStep, setClaimStep] = useState<"details" | "review" | "success">("details");
  const [claimFeedback, setClaimFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const claimReferenceRef = useRef<HTMLInputElement | null>(null);
  const claimStepTitleRef = useRef<HTMLHeadingElement | null>(null);
  const [feedback, setFeedback] = useState<string | null>(
    paymentResult === "succes"
      ? "Plata a fost trimisă. Actualizăm starea publicării imediat ce este confirmată."
      : paymentResult === "anulata"
        ? "Plata a fost anulată. Poți relua reînnoirea oricând."
        : submissionResult === "1"
          ? "Proprietatea a fost trimisă spre verificare."
          : updatedResult === "1"
            ? "Modificările proprietății au fost salvate."
        : null
  );
  const [feedbackTone, setFeedbackTone] = useState<"error" | "success" | "info">(
    paymentResult === "succes" || submissionResult === "1" || updatedResult === "1"
      ? "success"
      : "info"
  );
  const activeRef = useRef(true);
  const overviewRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      overviewRequestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (claimStep === "details") claimReferenceRef.current?.focus();
    else claimStepTitleRef.current?.focus();
  }, [claimStep]);

  const handleRequestError = useCallback((error: unknown, fallback: string, replaceOverview = false) => {
    const message = error instanceof Error ? error.message : fallback;
    const requiresLogin = error instanceof OwnerRequestError && error.status === 401;
    if (replaceOverview || requiresLogin) {
      setOverview(null);
      setOverviewError({
        message,
        requiresLogin,
        schemaUnavailable: error instanceof OwnerRequestError && error.code === "OWNER_PORTAL_SCHEMA_UNAVAILABLE",
      });
      return;
    }
    setFeedbackTone("error");
    setFeedback(message);
  }, []);

  const loadOverview = useCallback(async (options?: { quiet?: boolean }) => {
    overviewRequestRef.current?.abort();
    const controller = new AbortController();
    overviewRequestRef.current = controller;
    setOverviewError(null);
    if (!options?.quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await fetchOwnerApi(session.user.id, "/api/owner", {
        signal: controller.signal,
      });
      const body = await readResponse(response);
      if (!activeRef.current || controller.signal.aborted) return;
      if (!Array.isArray(body?.listings) || !Array.isArray(body?.claims)) {
        throw new Error("Răspunsul contului este incomplet. Încearcă din nou.");
      }
      setOverview({
        user: body?.user || { email: session.user.email || null },
        listings: body.listings,
        claims: body.claims,
        plan: body?.plan || null,
      });
    } catch (error) {
      if (!activeRef.current || controller.signal.aborted) return;
      handleRequestError(error, "Nu am putut încărca spațiul de proprietar.", true);
    } finally {
      if (activeRef.current && !controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [handleRequestError, session.user.id, session.user.email]);

  useEffect(() => {
    void loadOverview();
    return () => overviewRequestRef.current?.abort();
  }, [loadOverview]);

  const updateClaimContact = (field: keyof typeof claimContact, value: string) => {
    setClaimContact((current) => ({ ...current, [field]: value }));
    setClaimErrors((current) => ({ ...current, [field]: undefined }));
    setClaimFeedback(null);
  };

  const handleClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (claimSubmitting || signingOut || refreshing) return;
    const reference = listingReference.trim();
    if (!reference) {
      setClaimFeedback({ tone: "error", message: "Copiază aici linkul paginii cazării de pe CABN." });
      claimReferenceRef.current?.focus();
      return;
    }

    const { details, errors } = validateOwnerClaimDetails({ ...claimContact, message: claimMessage });
    setClaimErrors(errors);
    if (Object.keys(errors).length > 0) {
      setClaimStep("details");
      const firstInvalidField = Object.keys(errors)[0];
      const field = event.currentTarget.elements.namedItem(firstInvalidField);
      if (field instanceof HTMLElement) field.focus();
      return;
    }

    if (claimStep === "details") {
      setClaimFeedback(null);
      setClaimStep("review");
      return;
    }
    if (claimStep !== "review") return;

    setClaimSubmitting(true);
    setClaimFeedback(null);
    try {
      const response = await fetchOwnerApi(session.user.id, "/api/owner/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingReference: reference,
          ...details,
        }),
      });
      const body = await readResponse(response);
      if (!activeRef.current) return;
      const title = typeof body?.claim?.listingTitle === "string" ? body.claim.listingTitle : "cazarea ta";
      setClaimFeedback({ tone: "success", message: `Am primit cererea pentru „${title}”.` });
      setClaimStep("success");
      setListingReference("");
      setClaimMessage("");
      setClaimContact({ fullName: "", phone: "", role: "" });
      setClaimErrors({});
      await loadOverview({ quiet: true });
    } catch (error) {
      if (!activeRef.current) return;
      if (error instanceof OwnerRequestError && error.status === 401) {
        handleRequestError(error, "Cererea nu a putut fi trimisă.");
      } else {
        setClaimFeedback({
          tone: "error",
          message: error instanceof OwnerRequestError && error.status === 404
            ? "Nu am găsit cazarea. Deschide pagina ei din catalogul CABN și copiază linkul complet din bara de adrese."
            : error instanceof Error ? error.message : "Cererea nu a putut fi trimisă. Încearcă din nou.",
        });
        setClaimStep("details");
      }
    } finally {
      if (activeRef.current) setClaimSubmitting(false);
    }
  };

  const handleCheckout = async (listingId: string) => {
    if (checkoutListingId || signingOut || refreshing) return;
    setCheckoutListingId(listingId);
    setFeedback(null);
    try {
      const response = await fetchOwnerApi(session.user.id, "/api/owner/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId }),
      });
      const body = await readResponse(response);
      if (!activeRef.current) return;
      if (!body?.url) throw new Error("Linkul de plată nu este disponibil.");
      window.location.assign(String(body.url));
    } catch (error) {
      if (!activeRef.current) return;
      handleRequestError(error, "Nu am putut deschide plata.");
      setCheckoutListingId(null);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      if (!activeRef.current) return;
      setFeedbackTone("error");
      setFeedback(error instanceof Error ? error.message : "Nu am putut închide sesiunea.");
      setSigningOut(false);
    }
  };

  if (!overview) {
    const busy = loading || refreshing;
    return (
      <FormPageShell
        eyebrow="Cont proprietar"
        title={overviewError?.requiresLogin ? "Confirmă din nou accesul" : "Spațiul tău CABN"}
        description={`Cont: ${session.user.email || "proprietar"}. ${busy ? "Pregătim proprietățile și starea publicării." : "Proprietățile vor apărea după încărcarea cu succes a contului."}`}
      >
        {busy ? (
          <FormPageState title="Se încarcă..." description="Verificăm proprietățile asociate contului." />
        ) : (
          <div role="alert" className={`${cardClassName} p-5 sm:p-6`}>
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">
              {overviewError?.requiresLogin
                ? "Sesiunea a expirat"
                : overviewError?.schemaUnavailable
                  ? "Administrarea proprietăților este indisponibilă"
                  : "Nu am putut încărca proprietățile"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {overviewError?.message || "Încearcă din nou în câteva momente."}
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {!overviewError?.requiresLogin && (
            <button
              type="button"
              onClick={() => void loadOverview()}
              disabled={busy || signingOut}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
              {busy ? "Se încarcă..." : "Încearcă din nou"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {signingOut ? "Se închide..." : overviewError?.requiresLogin ? "Autentifică-te din nou" : "Ieși din cont"}
          </button>
          {!busy && !overviewError?.requiresLogin && (
            <Link href="/contact" className="text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300">
              Contactează echipa CABN
            </Link>
          )}
        </div>
        {feedbackTone === "error" && <ListingSubmitFeedback message={feedback} tone="error" />}
      </FormPageShell>
    );
  }

  const listings = overview.listings;
  const claims = overview.claims;
  const plan = overview.plan;
  const planPrice = formatPrice(plan);
  const activeListings = listings.filter((listing) => listing.isPublished).length;
  const attentionListings = listings.filter(
    (listing) => listing.canRenew || listing.status === "expired" || listing.status === "expiring"
  ).length;

  return (
    <FormPageShell
      eyebrow="Spațiul proprietarului"
      title="Proprietățile tale"
      description={`Bine ai venit${overview?.user?.email ? `, ${overview.user.email}` : ""}. Listează o cazare nouă gratuit sau administrează proprietățile asociate contului tău.`}
      highlights={[
        { label: "Proprietăți", value: String(listings.length) },
        { label: "Publicate", value: String(activeListings) },
        { label: "Necesită atenție", value: String(attentionListings) },
      ]}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
          Sesiune securizată
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOverview({ quiet: true })}
            disabled={refreshing || signingOut}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            Actualizează
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-orange-500/10 dark:hover:text-orange-200"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {signingOut ? "Se închide..." : "Ieși din cont"}
          </button>
        </div>
      </div>

      <ListingSubmitFeedback message={feedback} tone={feedbackTone} />

      <section aria-labelledby="owner-listings-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="owner-listings-title" className="text-2xl font-semibold text-zinc-950 dark:text-white">
              Proprietăți asociate
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Editează informațiile și urmărește starea publicării fiecărei cazări.
            </p>
          </div>
          <Link
            href="/add-property"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-200"
          >
            Listează cazarea gratuit
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className={`${cardClassName} p-6 sm:p-8`}>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-xl font-semibold text-zinc-950 dark:text-white">Nicio proprietate asociată încă</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Cazarea ta este deja pe CABN? Solicită acces pentru a o administra. Dacă nu este încă listată, adaug-o gratuit.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href="/add-property" className="inline-flex h-11 items-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500">
                Listează prima cazare gratuit
              </Link>
              <a href="#claim-title" className="text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300">
                Cazarea mea este deja pe CABN
              </a>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {listings.map((listing) => {
              const status = statusPresentation(listing);
              const paymentPending = listing.pendingPayment?.status === "pending";
              const checkoutUrl = listing.pendingPayment?.checkoutUrl;
              return (
                <article key={listing.id} className={`${cardClassName} overflow-hidden`}>
                  <div className="grid min-h-[210px] sm:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="relative min-h-40 overflow-hidden bg-emerald-950/5 sm:min-h-full">
                      {listing.image ? (
                        <Image
                          src={listing.image}
                          alt=""
                          fill
                          sizes="(max-width: 639px) calc(100vw - 32px), 180px"
                          quality={CARD_IMAGE_QUALITY}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(145deg,#d1fae5,#f4f4f5)] text-emerald-800 dark:bg-[linear-gradient(145deg,#052e2b,#27272a)] dark:text-emerald-200">
                          <Building2 className="h-9 w-9" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="min-w-0 flex-1 truncate text-lg font-semibold text-zinc-950 dark:text-white">
                          {listing.title}
                        </h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                        <p className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                          {listing.expiresAt
                            ? `Publicare până la ${formatDate(listing.expiresAt)}`
                            : `Creată la ${formatDate(listing.createdAt)}`}
                        </p>
                        {listing.daysUntilExpiry !== null && listing.daysUntilExpiry >= 0 && (
                          <p className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                            {listing.daysUntilExpiry === 0
                              ? "Expiră astăzi"
                              : `Mai sunt ${listing.daysUntilExpiry} zile`}
                          </p>
                        )}
                        {paymentPending && (
                          <p className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
                            <CreditCard className="h-4 w-4" aria-hidden="true" />
                            Plata pentru reînnoire este în curs
                          </p>
                        )}
                      </div>

                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                        <Link
                          href={`/edit-property/${listing.id}?client=1`}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Editează
                        </Link>
                        {listing.slug && listing.isPublished && (
                          <Link
                            href={`/cazare/${listing.slug}`}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            Vezi pagina
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        )}
                        {paymentPending && checkoutUrl ? (
                          <a
                            href={checkoutUrl}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:focus-visible:ring-offset-zinc-900"
                          >
                            Continuă plata
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          </a>
                        ) : listing.canRenew ? (
                          <button
                            type="button"
                            onClick={() => void handleCheckout(listing.id)}
                            disabled={Boolean(checkoutListingId) || signingOut || refreshing}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:focus-visible:ring-offset-zinc-900"
                          >
                            <CreditCard className="h-4 w-4" aria-hidden="true" />
                            {checkoutListingId === listing.id
                              ? "Se pregătește..."
                              : `Reînnoiește${planPrice ? ` · ${planPrice}` : ""}`}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section aria-labelledby="claim-title" className={`${cardClassName} p-5 sm:p-6`}>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="claim-title" className="scroll-mt-24 text-xl font-semibold text-zinc-950 dark:text-white">
                Cazarea ta este deja pe CABN?
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Solicită acces pentru a-i administra informațiile, fără să creezi o listare nouă.
              </p>
            </div>
          </div>

          <ol aria-label="Pașii solicitării" className="mt-5 grid grid-cols-3 gap-3 border-b border-zinc-100 pb-5 dark:border-white/10">
            {["Găsește cazarea", "Confirmă cererea", "Verificare CABN"].map((label, index) => {
              const currentStep = claimStep === "details" ? 0 : claimStep === "review" ? 1 : 2;
              return (
                <li key={label} aria-current={index === currentStep ? "step" : undefined} className="flex flex-col items-start gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${index === currentStep ? "bg-emerald-700 text-white" : index < currentStep ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                    {index + 1}
                  </span>
                  {label}
                </li>
              );
            })}
          </ol>

          {claimStep === "success" ? (
            <div className="mt-5 space-y-4">
              <h3 ref={claimStepTitleRef} tabIndex={-1} className="text-lg font-semibold text-zinc-950 outline-none dark:text-white">
                Cererea a fost trimisă
              </h3>
              <ListingSubmitFeedback message={claimFeedback?.message || null} tone="success" />
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Echipa CABN va verifica solicitarea. După aprobare, cazarea va apărea în lista de proprietăți de mai sus și o vei putea administra. Poți urmări starea în „Cererile tale de acces”.
              </p>
              <button
                type="button"
                onClick={() => {
                  setClaimFeedback(null);
                  setClaimStep("details");
                }}
                disabled={refreshing || signingOut}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Solicită acces la altă cazare
              </button>
            </div>
          ) : (
            <form onSubmit={handleClaim} aria-label="Solicită administrarea unei cazări" aria-busy={claimSubmitting} className="mt-5">
              <fieldset disabled={claimSubmitting || signingOut || refreshing} className="space-y-4">
                {claimFeedback && (
                  <div id="claim-feedback">
                    <ListingSubmitFeedback message={claimFeedback.message} tone={claimFeedback.tone} />
                  </div>
                )}
                {claimStep === "details" ? (
                  <>
                    <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/60">
                      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        Găsește cazarea în catalog, deschide pagina ei și copiază linkul din bara de adrese.
                      </p>
                      <Link href="/" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300">
                        Caută cazarea pe CABN
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">(se deschide într-o filă nouă)</span>
                      </Link>
                    </div>
                    <div>
                      <label htmlFor="listing-reference" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Linkul paginii cazării
                      </label>
                      <input
                        ref={claimReferenceRef}
                        id="listing-reference"
                        type="text"
                        inputMode="url"
                        autoCapitalize="none"
                        autoComplete="off"
                        spellCheck={false}
                        value={listingReference}
                        onChange={(event) => {
                          setListingReference(event.target.value);
                          setClaimFeedback(null);
                        }}
                        placeholder="https://www.cabn.ro/cazare/numele-cazarii"
                        required
                        maxLength={300}
                        aria-invalid={claimFeedback?.tone === "error"}
                        aria-describedby={`listing-reference-help${claimFeedback ? " claim-feedback" : ""}`}
                        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                      <p id="listing-reference-help" className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Folosește linkul paginii de prezentare a cazării, nu doar numele acesteia.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="claim-full-name" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Nume și prenume <span className="font-normal text-zinc-500">(obligatoriu)</span>
                      </label>
                      <input
                        id="claim-full-name"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        value={claimContact.fullName}
                        onChange={(event) => updateClaimContact("fullName", event.target.value)}
                        required
                        minLength={3}
                        maxLength={OWNER_CLAIM_LIMITS.fullName}
                        aria-invalid={Boolean(claimErrors.fullName)}
                        aria-describedby={claimErrors.fullName ? "claim-full-name-error" : undefined}
                        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                      {claimErrors.fullName && (
                        <p id="claim-full-name-error" role="alert" className="mt-2 text-xs leading-5 text-red-700 dark:text-red-300">{claimErrors.fullName}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="claim-phone" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Număr de telefon <span className="font-normal text-zinc-500">(obligatoriu)</span>
                      </label>
                      <input
                        id="claim-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        value={claimContact.phone}
                        onChange={(event) => updateClaimContact("phone", event.target.value)}
                        placeholder="0722 123 456 sau +40 722 123 456"
                        required
                        maxLength={OWNER_CLAIM_LIMITS.phone}
                        aria-invalid={Boolean(claimErrors.phone)}
                        aria-describedby={`claim-phone-help${claimErrors.phone ? " claim-phone-error" : ""}`}
                        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                      <p id="claim-phone-help" className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Echipa CABN te poate contacta la acest număr pentru verificarea cererii. Numărul nu va fi afișat pe pagina publică a cazării.
                      </p>
                      {claimErrors.phone && (
                        <p id="claim-phone-error" role="alert" className="mt-2 text-xs leading-5 text-red-700 dark:text-red-300">{claimErrors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="claim-role" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Calitatea în care soliciți acces <span className="font-normal text-zinc-500">(obligatoriu)</span>
                      </label>
                      <select
                        id="claim-role"
                        name="role"
                        value={claimContact.role}
                        onChange={(event) => updateClaimContact("role", event.target.value)}
                        required
                        aria-invalid={Boolean(claimErrors.role)}
                        aria-describedby={claimErrors.role ? "claim-role-error" : undefined}
                        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      >
                        <option value="" disabled>Selectează calitatea</option>
                        {OWNER_CLAIM_ROLES.map((role) => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                      {claimErrors.role && (
                        <p id="claim-role-error" role="alert" className="mt-2 text-xs leading-5 text-red-700 dark:text-red-300">{claimErrors.role}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="claim-email" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Emailul contului
                      </label>
                      <input
                        id="claim-email"
                        type="email"
                        value={session.user.email || ""}
                        readOnly
                        aria-describedby="claim-email-help"
                        className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-600 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300"
                      />
                      <p id="claim-email-help" className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Preluat automat din contul autentificat. Accesul va fi asociat acestui cont după aprobare.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="claim-message" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        Detalii suplimentare <span className="font-normal text-zinc-500">(opțional)</span>
                      </label>
                      <textarea
                        id="claim-message"
                        name="message"
                        value={claimMessage}
                        onChange={(event) => {
                          setClaimMessage(event.target.value);
                          setClaimErrors((current) => ({ ...current, message: undefined }));
                          setClaimFeedback(null);
                        }}
                        rows={3}
                        maxLength={OWNER_CLAIM_LIMITS.message}
                        aria-invalid={Boolean(claimErrors.message)}
                        aria-describedby={`claim-message-help${claimErrors.message ? " claim-message-error" : ""}`}
                        placeholder="De exemplu: unde putem verifica legătura ta cu această cazare."
                        className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                      <p id="claim-message-help" className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Câteva detalii ne ajută să verificăm solicitarea.
                      </p>
                      {claimErrors.message && (
                        <p id="claim-message-error" role="alert" className="mt-2 text-xs leading-5 text-red-700 dark:text-red-300">{claimErrors.message}</p>
                      )}
                    </div>
                    <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:focus-visible:ring-offset-zinc-900">
                      Continuă
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <h3 ref={claimStepTitleRef} tabIndex={-1} className="text-lg font-semibold text-zinc-950 outline-none dark:text-white">
                      Verifică cererea înainte de trimitere
                    </h3>
                    <dl className="space-y-3 rounded-2xl bg-zinc-50 p-4 text-sm dark:bg-zinc-950/60">
                      <div>
                        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Pagina cazării</dt>
                        <dd className="mt-1 break-words text-zinc-600 dark:text-zinc-300">{listingReference.trim()}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Nume și prenume</dt>
                        <dd className="mt-1 break-words text-zinc-600 dark:text-zinc-300">{claimContact.fullName.trim().replace(/\s+/g, " ")}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Telefon de contact</dt>
                        <dd className="mt-1 break-words text-zinc-600 dark:text-zinc-300">{claimContact.phone.trim()}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Calitate</dt>
                        <dd className="mt-1 text-zinc-600 dark:text-zinc-300">{OWNER_CLAIM_ROLES.find((role) => role.value === claimContact.role)?.label}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Contul care solicită acces</dt>
                        <dd className="mt-1 break-words text-zinc-600 dark:text-zinc-300">{session.user.email}</dd>
                      </div>
                      {claimMessage.trim() && (
                        <div>
                          <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Detalii pentru verificare</dt>
                          <dd className="mt-1 whitespace-pre-wrap break-words text-zinc-600 dark:text-zinc-300">{claimMessage.trim()}</dd>
                        </div>
                      )}
                    </dl>
                    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      Trimiterea cererii nu acordă acces imediat. Echipa CABN verifică solicitarea înainte de asocierea proprietății cu acest cont.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => setClaimStep("details")} className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                        Înapoi
                      </button>
                      <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:focus-visible:ring-offset-zinc-900">
                        <Send className="h-4 w-4" aria-hidden="true" />
                        {claimSubmitting ? "Se trimite cererea..." : "Trimite cererea de acces"}
                      </button>
                    </div>
                  </>
                )}
              </fieldset>
            </form>
          )}
        </section>

        <aside aria-labelledby="claim-history-title" className={`${cardClassName} p-5 sm:p-6`}>
          <h2 id="claim-history-title" className="text-xl font-semibold text-zinc-950 dark:text-white">
            Cererile tale de acces
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Urmărește starea solicitărilor trimise.
          </p>

          {claims.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Nu ai trimis încă o cerere. După trimitere, starea ei va apărea aici.
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-zinc-100 dark:divide-white/10">
              {claims.map((claim) => {
                const status = claimStatusPresentation(claim.status);
                return (
                  <li key={claim.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                          {claim.listingTitle}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Trimisă la {formatDate(claim.createdAt)}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                          {status.description}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs font-bold ${status.className}`}>{status.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-300">
            Ai nevoie de ajutor?{" "}
            <Link href="/contact" className="font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300">
              Contactează echipa CABN
            </Link>
          </p>

          <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100">
            <h3 className="text-base font-semibold">Listează cazarea gratuit</h3>
            <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
              Cazarea ta nu este încă pe CABN? Adaugă fotografiile și detaliile, apoi trimite-o spre verificare.
            </p>
            <Link href="/add-property" className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900">
              Începe listarea gratuită
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </FormPageShell>
  );
}

function OwnerPageContent() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "";
  const paymentResult = searchParams.get("plata") || "";
  const submissionResult = searchParams.get("trimis") || "";
  const updatedResult = searchParams.get("actualizat") || "";
  const initialListingReference = searchParams.get("listing") || searchParams.get("claim") || "";

  return (
    <OwnerOtpGate nextPath={nextPath}>
      {({ session, signOut }) => (
        <OwnerDashboard
          session={session}
          signOut={signOut}
          initialListingReference={initialListingReference}
          paymentResult={paymentResult}
          submissionResult={submissionResult}
          updatedResult={updatedResult}
        />
      )}
    </OwnerOtpGate>
  );
}

export default function OwnerPage() {
  return <Suspense fallback={null}><OwnerPageContent /></Suspense>;
}
